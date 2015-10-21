

function analyseTrainingSet(step) {

    var detailsText = '', finished = 0, p = 0;
    if (step == 0) {

	$('#processDlg').dialog("open");
	detailsText = 'Converting macros...';
    }else if (step == 1) {

	var start = +new Date();
	convertMacro(trainSet);
	var end = +new Date();
	console.log("convertMacro in " + (end-start) + " milliseconds");
	detailsText = ' (' + (end-start) + ' ms)<br/>';
	detailsText += 'Search for one token features...';
	p = 33;
    }else if (step == 2) {

	start = +new Date();
	commonPatterns(trainSet);
	end = +new Date();
	console.log("commonPatterns in " + (end-start) + " milliseconds");
	detailsText = ' (' + (end-start) + ' ms)<br/>';
	detailsText += 'Search for common patterns...';
	p = 66;
    }else if (step == 3) {

	start = +new Date();
	collectPattern(trainSet, 0);
	return;
	/*end = +new Date();
	console.log("collectPattern in " + (end-start) + " milliseconds");
	detailsText = ' (' + (end-start) + ' ms)<br/>';
	*/
    }else if (step == 4) {

		setTimeout(function(){
			$('#processDlg').dialog("close");
			$('#processDetails').html('');
		}, 900);
		finished = 1;
		p= 100;
    }

    if (!finished){

        $('#processDetails').html($('#processDetails').html() + detailsText);
        $( "#processProgressbar" ).progressbar({value: p})
		setTimeout(function(){analyseTrainingSet(step+1);}, 50);
    }
}

function fillSelectedWN(){
    var arr = $('#selectedWNTable').val().split('\n');
    selectedWN = {};


    for(var i=0; i<arr.length; i++){

        var t = arr[i].trim();
	selectedWN[t] = {};
    }
}

function checkWNsynsets(synsets){
    if (!synsets) {
	return "";
    }
    var arr = synsets.split('/'), r = [];
    for(var i=0; i<arr.length; i++){
	if (typeof selectedWN[ arr[i] ] != 'undefined') {
	    r.push(arr[i]);
	}
    }
    return r.join('/');
}

function refreshExportPreview() {
    var t,o,wn;

    if ($("#exportTrain").attr('checked') == 'checked')
		t = [trainSet[0], trainSet[2]];
    else
		t = [testSet[0], testSet[2]];
    o = $("#exportOriginal").attr('checked') == 'checked';
    wn = $("#exportWN").attr('checked') == 'checked';
    exportPreview('#exportPreview', t, o, wn);

    //$('#exportDlg').dialog('open');
}

function exportContent(s, original, wnCol){
    var f = '';

    for(var i = 0; i<s.length; i++){
		for(var w = 0; w<s[i].length; w++){
			//word":"on","stem":"","category":"IN","mycategory":"[IN]","other":null,"iob":"O"}
			if (original) {
				f += s[i][w].word + "\t" + s[i][w].category.replace(/[\[\]]/g, "") + "\t" + s[i][w].iob + "\n";
			}else{
				var wn = checkWNsynsets(s[i][w].other);
				f += s[i][w].word + "\t";
				var c = s[i][w].mcategory.replace(/[\[\]]/g, "");
				if(wnCol){
					//wordnet synset (if it exists) OR pos
					if (wn == '') {
					f += c + "\t";
					}else
					f += wn + "\t";
				}else // or pos + wn
					f += c + "\t" + (wn==''?'-':wn) + "\t";
				f += s[i][w].iob + "\n";
			}
		}
		f += "\n";
    }
    return f;
}


function exportPreview(id, s, original, wnCol){
    var f = exportContent(s, original, wnCol);
    $(id).val(f);
}

function exportSet(filename, s, orig, wnCol){
    var f = exportContent(s, orig, wnCol);
    download2(filename, f);
}

function download(filename, text) {
  var pom = document.createElement('a');
  pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  pom.setAttribute('download', filename);

  pom.style.display = 'none';
  document.body.appendChild(pom);

  pom.click();

  document.body.removeChild(pom);
}

function download2(filename, text) {
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([text], {type: 'text/csv'}));
    a.download = filename;

    // Append anchor to body.
    document.body.appendChild(a)
    a.click();

    // Remove anchor from body
    document.body.removeChild(a);
}

function showDialog(cat) {
    $('#wordDetailsDlg').dialog( "open" );


    $('#wordDetailsContent').addClass("ui-autocomplete-loading");

    $.ajax({type:"get",url:"index.php?task=catable&type=word&category="+encodeURIComponent(cat)+"&limit=100",success: function(data){

	$('#wordDetailsContent').removeClass("ui-autocomplete-loading");
	$('#wordDetailsContent').html(data);
	styletable('');
    }});
}

function loadAttributes(s){

    var r = {};
    var list = s.split(" ");
    for(var i = 0; i<list.length; i++){
	    var p = list[i].indexOf("=");
	    if (p == -1) continue;

	    var name = list[i].substr(0, p);
	    var value = list[i].substr(p+1);
	    if (value.length > 1 && value.charAt(0) == '"'){
		    value = value.substring(1, value.length - 1);
	    }
	    r[ name ] = value;
    }
    return r;
}


function loadMacros() {

    var lines = macroEditor.getValue().split('\n');
    var r = [];
    for(var i=0; i<lines.length; i++){

	lines[i] = removeComment(lines[i]);
	var t = lines[i].trim();
	if (t == "") continue;

	var parts = lines[i].split(":");
	var attr = loadAttributes(parts[1]);
	attr.newCategory = parts[0];

	r.push(attr);
    }
    return r;
}

function convertMacro(set) {
    /*

[Macro definitions]
# symbols on the right side will be replaced with the left one
#
# e.g.
# THAT: cat="KOT" surface="hogy"
#  cat="KOT"  category is "KOT"
#  surface="hogy" surface is "hogy", it will be called "THAT"
#  regex="^((?!ez|az).)*$" regex pattern for surface/stem (case insensitive)
#  nextRegEx="(((MN|SZN)\+(NOM|PL|DAT|ACC))|IGE\+_OKEP)" category of the next word
#  resetFullCategory="1" any other category info will be reset (e.g. "MIB _OKEP INE" => "MIB"
#
# "!_MIB" means not "_MIB"
#CAS=ACC,ABL,ADE,SUP,INE,INS,SUB,ELA,ALL,ILL,DAT,DEL

FN_PROP:cat="FN" surface="CNN"
FN_PROP:cat="FN" surface="TOM"
FN_PROP:cat="FN" surface="Lantos"
#FN_PROP:cat="FN" regex="^[A-ZÁÖÁÚÜÓÍ]"
#FN_PROP:cat="FN" surface="András"
#FN_PROP:cat="FN" surface="Lukin"
#FN_PROP:cat="FN" surface="Tibor"
#FN_PROP:cat="FN" surface="István"
#FN_PROP:cat="FN" surface="József"
#FN_PROP:cat="FN" surface="Tamás"
#FN_PROP:cat="FN" surface="Ottó"


#ujabb kor
AZON:cat="DET|NM" regex="^azon$"
EZEN:cat="DET|NM" regex="^ezen$"
MMELY:cat="DET|NM" regex="^mely$"
AMILYEN:cat="FN" regex="^amilyen$"
AMIN:cat="FN" regex="^amin$"
AMOLYAN:cat="FN" regex="^amolyan$"
MIVEL:cat="KOT" regex="^mivel$"
IS:cat="HA" regex="^is$"
OLYAN:cat="FN" regex="^olyan$"
    */
    /*var macro = [
	     {
		surface:"is",
		category:"Cccw",
		newCategory:"IS"
	     },
	     {
		//surface:"mert",
		category:"Cssp",
		regex:"^mert$",
		newCategory:"MERT"
	     },
	     {
		//surface:"mert",
		category:"Ccsw",
		regex:"^de$",
		newCategory:"DE"
	     },
	     {
		//surface:"mert",
		category:"Ccsw",
		regex:"^pedig$",
		newCategory:"PEDIG"
	     },
	     {
		//surface:"mert",
		category:"Pd3-sn",
		regex:"^olyan$",
		newCategory:"OLYAN"
	     },
	     {
		surface:"legutóbbi",
		category:"Afs-sh",
		newCategory:"LUTOBBI"
	     },

	     {
		category:"Pd3-pa",
		regex:"^azon$",
		newCategory:"AZON"
	     }
	     ];*/
    var macro = loadMacros();

    for (var i=0; i<set.length; i++){

	for(var w=0; w<set[i].length; w++){

	    /*if (set[i][w].stem == 'olyan') {
		var tttt = 0;
	    }*/

	    set[i][w].mcategory = set[i][w].category;
	    for(var z=0; z<macro.length; z++){
		if (set[i][w].category.search(macro[z].category) != -1) {
		    // cat is matched

		    if (typeof macro[z].regex != 'undefined') {
			re = new RegExp(macro[z].regex, "gi");

			if ((m = re.exec(set[i][w].stem)) != null){
			    set[i][w].mcategory = macro[z].newCategory;
			    break;
			}
		    }else if (typeof macro[z].surface != 'undefined' && macro[z].surface == set[i][w].word ||
			      typeof macro[z].stem != 'undefined' && macro[z].stem == set[i][w].stem) {
			set[i][w].mcategory = macro[z].newCategory;
			break;
		    }
		}
	    }
	}
    }
}

function addMacroDlg(word, cat) {
    var t = word.toUpperCase() + ": category=\"" + cat.replace(/[\[\]]/g, "") + "\" surface=\"" + word + "\"";
    $('#newMacroId').val(t);
    $('#macroDlg').dialog('open');
}

function addMacro(line) {

    appendTo(macroEditor, line+"\n");
}


function showCategoryExampleTable(arr, filter){
    var t='',html = '<table id="examplTID" class="tablesorter" style="width:400px">';
    html += '<thead><tr><th>label</th>';
    html += '<th>word</th>';
    html += '<th>sum</th></tr></thead><tbody>';

    for(var item in arr){

	if (item != filter) {
	    continue;
	}

	t = item;
	var c = arr[item];

	//var sum = 0;
	for (var i=0; i<c.length; i++) {
	    for (var j=0; j<c[i].words.length; j++) {
		html += '<tr>';
		html += '<td>';
		if (arr == catPatterns) {
		    html += '<span class="ui-button" onclick="addMacroDlg(\''+c[i].words[j].word+'\', \''+item+'\')" title="add macro"><span class="ui-icon ui-icon-circle-plus"></span></span> ';
		}
		html += ' ' + c[i].words[j].word+'</td>';
		html += '<td>'+c[i].label+'</td>';
		html += '<td>'+c[i].words[j].counter+'</td>';
	        html += '</tr>';
	      //  sum += c[i].counter;
	    }
	    //html += '<td>'+sum+'</td>';
	}
	break;
    }
    html += '</tbody></table>';

    $('#wordDetailsDlg').dialog( "open" ).dialog('option', 'title', 'Details of "' + t + '"');
    $('#wordDetailsContent').html(html);
    //styletable('');
    $('#examplTID').tablesorter();
}
var lastFilter = {};
function getLastFilter(name){
    if (typeof lastFilter[name] == 'undefined') {
	lastFilter[name] = '';
	return '';
    }
    return lastFilter[name];
}

function filterCat(o, id){
    var tmp = o.value;//.toUpperCase();
    if (getLastFilter(id) == tmp) {
	return;
    }
    var l = $(id=='catTable' ? '#catMinID': '#wnMinID').spinner('value');
    var l2 = $(id=='catTable' ? '#catMinpercentID': '#wnMinpercentID').spinner('value');
    showCategoryTable(id, (id=='catTable' ? catPatterns : wnPatterns), tmp, l, l2);
    lastFilter[id] = tmp;

   // $(o).focus();
}

function addWN(w) {
    selectedWN[w] = {};
    $('#selectedWNTable').val($('#selectedWNTable').val() + w + '\n');
}

function showCategoryTable(id, arr, filter, limit, rateLimit){

    var html = '<table id="'+id+'Table" class="tablesorter" style="width:500px">'; //jtable
    html += '<thead><tr><th>category</th>';//<br/><a href="#" onclick= "$(\'#filterDlg\').dialog(\'open\')">filter</a>';
    //html += '<span class="ui-button" onclick= "$(\'#filterDlg\').dialog(\'open\')" title="filter"><span class="ui-icon ui-icon-search"></span></span></th>';
    html += '<th class="colSum">sum</th>';
    html += '<th class="colLabel">label</th>';
    html += '<th class="colSum">freq</th><th class="colPer">%</th></tr></thead><tbody>';



    var r = new RegExp(filter, 'i');
    for(var item in arr){


	if (item.search(r) == -1) {
	    continue;
	}

	var c = arr[item];
	var sum = 0, bestValue = 0;
	for (var i=0; i<c.length; i++) {
	    sum += c[i].counter;
	}

	if (sum < limit) {
	    continue;
	}



	//html += '<tr><td rowspan="'+c.length+'"><a href="#" onclick="showCategoryExampleTable('+(id=='catTable' ? 'catPatterns' : 'wnPatterns') +', \''+item+'\')">'+item+'</a></td>';
	var lhtml = '<tr><td>';
	if (arr == wnPatterns) {
	    lhtml += '<span class="ui-button" onclick="addWN(\''+item+'\')" title="add WordNet synset"><span class="ui-icon ui-icon-circle-plus"></span></span> ';
	}
	lhtml += '<a href="#" onclick="showCategoryExampleTable('+(id=='catTable' ? 'catPatterns' : 'wnPatterns') +', \''+item+'\')">'+item+'</a></td>';
	lhtml += '<td class="colSum">'+sum+'</td>';
	lhtml += '<td colspan="3"><table><tr>'; //
	for (var i=0; i<c.length; i++) {
	    if (i != 0) lhtml += '<tr>';
	    lhtml += '<td class="colLabel">'+c[i].label+'</td>';
	    lhtml += '<td class="colSum">'+c[i].counter+'</td>';
	    var p = (100*c[i].counter/sum).toFixed(2);
	    lhtml += '<td class="colPer">'+p+'%</td></tr>';
	    if (parseFloat(p) > parseFloat(bestValue)) {
		bestValue = p;
	    }
	  //  sum += c[i].counter;
	}
	if (parseFloat(bestValue) < parseFloat(rateLimit)) {
	    continue;
	}
	html += lhtml;
	html += '</table><!-- bestValue:'+bestValue*100+'.' + sum+' --></td></tr>'; //
	//html += '<!-- bestValue:'+bestValue+' -->'; //
	//html += '<td>'+sum+'</td>';
        //html += '</tr>';
    }
    html += '</tbody></table>';
    $("#" + id).html(html);
    $("#" + id + "Table").tablesorter({
	textExtraction: function(node) {
	    var v = node.innerHTML.match(/<!-- bestValue:([\d\.]+) -->/);
	    if (v) {
		return v[1];
	    }
	    return node.innerHTML;
	},
	headers: {
		// assign the secound column (we start counting zero)
		2: {
		    // disable it by setting the property sorter to false
		    sorter: false
		},
		// assign the third column (we start counting zero)
		3: {
		    // disable it by setting the property sorter to false
		    sorter: false
		}
	    }
	}
    );
    //styletable('');
}


function addCategoryPattern(arr, key, item){

    var c = arr[key];
    if (typeof c == 'undefined') {
	arr[key] = [{label: item.iob, counter: 1, words: [{word: item.word, counter: 1}]}];
    }else{
	var found = 0;
	for(var t = 0; t<c.length; t++){
	    if (c[t].label == item.iob){
		c[t].counter++;
		found = 1;

		//surface form as well
		var foundw = 0;
		for(var t2 = 0; t2<c[t].words.length; t2++){
		    if (c[t].words[t2].word == item.word){
			c[t].words[t2].counter++;
			foundw = 1;
			break;
		    }
		}
		if (foundw == 0) {
		    c[t].words.push({word: item.word, counter: 1});
		}
		break;
	    }
	}
	if (found == 0) {
	    c.push({label: item.iob, counter: 1, words: [{word: item.word, counter: 1}]});
	}
    }
}


function showAllPatternExamples(pat){

    var c = patternsExample[ pat ];
    if (typeof c == 'undefined') {
	return;
    }

    var html = '<table>', size=3;
    for(var i=0; i<c.length; i++){

	var sentence = '', l=0, pos=[];
	for(var w=0; w<trainSet[c[i]].length; w++){
	    sentence += "<" + trainSet[c[i]][w].mcategory + "> ";
	    l += trainSet[c[i]][w].mcategory.length + 3;
	    pos.push(l);
	}
	var startPos = getPosition(sentence.indexOf(pat), pos), len = pat.split(" ").length - 1;

	html += '<tr><td>';
	var r1 = '', r2 = '', r3 = '', start = Math.max(0, startPos-size), end = Math.min(startPos+len+size, trainSet[c[i]].length);
	// [{"id":"47378","corpus_id":null,"type_id":"0","sentence_id":"2012","position":"0","word":"Confidence","stem":"","category":"NN","mycategory":"[NN]","other":null,"iob":"B-NP"}
	for(var k=0;k<size-startPos+1; k++){
	    r1 += '<td></td>';
	    r2 += '<td></td>';
	    r3 += '<td></td>';
	}
	if (start > 0) {
   	    r1 += '<td></td>';
	    r2 += '<td></td>';
	    r3 += '<td>...</td>';
	}
	for(var k=start; k<end; k++){
	    var cl = k>=startPos && k<startPos+len?'highlight':'';
	    r1 += '<td class="row '+cl+'">'+trainSet[c[i]][k].iob+'</td>';
	    r2 += '<td class="middleRow '+cl+'">'+trainSet[c[i]][k].mcategory+'</td>';
	    r3 += '<td class="'+cl+'">'+trainSet[c[i]][k].word+'</td>';
	}
	if (end < trainSet[c[i]].length) {
   	    r1 += '<td></td>';
	    r2 += '<td></td>';
	    r3 += '<td>...</td>';
	}
	for(var k=0;k<trainSet[c[i]].length-end; k++){
	    r1 += '<td></td>';
	    r2 += '<td></td>';
	    r3 += '<td></td>';
	}

	html += '<tr>' + r1 + '</tr>';
	html += '<tr>' + r2 + '</tr>';
	html += '<tr>' + r3 + '</tr>';
	html += '</td></tr>';
	html += '<tr><td colspan="'+2*size+len+'"><hr></td></tr>';
    }
    html += '</table>';
    $('#wordDetailsDlg').dialog( "open" ).dialog('option', 'title', 'Occurences of "' + pat + '"');
    $('#wordDetailsContent').html(html);
    styletable('');
}

function addPatternExamples(pat, sid){

    var c = patternsExample[ pat ];
    if (typeof c == 'undefined') {
	patternsExample[ pat ] = [sid];
    }else{
	c.push(sid);
    }
}

function collectPattern(s, start){

	if (start == 0){
		patternsExample = {};
		catPatterns = {};
		wnFilled = (wnPatterns.length > 0);
	}
    //wnPatterns = {};
    for(var i=start; i<s.length; i++){

		var sentence="", pos=[], len=0, r_sentence=[];
		var goldNP = getNP(s[i]);
		for(var w=0; w<s[i].length; w++){
			sentence += "<" + s[i][w].mcategory + "> ";
			len += s[i][w].mcategory.length + 3;
			pos.push(len);

			//pos => iob:
			addCategoryPattern(catPatterns, s[i][w].mcategory, s[i][w]);
			//wordnet => iob: it is enough for once
			if (!wnFilled) {
			var wnKeys = s[i][w].other == "" ? [] : s[i][w].other.split("/");
			for (var k=0; k<wnKeys.length; k++) {
				addCategoryPattern(wnPatterns, wnKeys[k], s[i][w]);
			}
			}

			r_sentence.push({"iob":s[i][w].iob});
		}

		for(var n=0; n<patterns.length; n++){
			var k = sentence.indexOf(patterns[n].pattern);
			if (k != -1) {
			var p1 = getPosition(k, pos);
			var p2 = getPosition(k+patterns[n].pattern.length-2, pos); //

			//example
			addPatternExamples(patterns[n].pattern, i);
			//HUN
			//var itIsNp = r_sentence[p1].iob == 'B' && r_sentence[p2].iob == 'E' ||
			//    r_sentence[p1].iob == '1-N_1' && r_sentence[p2].iob == '1-N_1';

			//ENG
			var nn=1, itIsNp = r_sentence[p1].iob == 'B-NP';
			while (nn<=p2 && p1+nn<r_sentence.length && r_sentence[p1+nn].iob == 'I-NP') {
				nn++;
			}
			if (nn < p2-p1+1) itIsNp = false;

			if (itIsNp)
				patterns[n].good++;
			else
				patterns[n].bad++;
			if (typeof patterns[n].ex == 'undefined') patterns[n].ex = [];
			var surf = [], iobseq = [], offset=!itIsNp && nn > p2-p1+1 ? 1 : 0;

			for(var f=p1; f<=p2; f++){ //  + offset
				surf.push(s[i][f].word);
				iobseq.push(r_sentence[f].iob);
			}

			if (patterns[n].ex.length < 200)
				patterns[n].ex.push({
					words: surf,
					categories: decodeTags(sentence.substr(k, k+patterns[n].pattern.length-1)).split(" "),
					iob: iobseq,
					sentence_id: s[i][0].sid});
			}
		}
		
		if (i>0 && i % 200 == 0) {
			setTimeout(function(){collectPattern(s, i+1);}, 50);
			$( "#processProgressbar" ).progressbar({value: 66+(33.3*i/s.length)});
			return;
		}
    }

    /*
    {
            "words": [
                "az",
                "anconai"
            ],
            "categories": [
                "[Tf]",
                "[Afp-sn]"
            ],
            "iob": [
                "B",
                "I"
            ],
            "sentence_id": "17376"
        }
    */
    //show patterns
    for(var n=0; n<patterns.length; n++){
		var data = {unique: (patterns[n].bad == 0), np: (patterns[n].bad == 0), rows: patterns[n].ex};
		addExampleInfo("#status"+n, data, patterns[n].pattern, patterns[n].exampleId);
    }

    var l = $('#catMinID').spinner('value');
    var l2 = $('#catMinpercentID').spinner('value');

    showCategoryTable('catTable', catPatterns, getLastFilter('catTable'), l, l2);
    //bestPatterns(wnPatterns, 0.8);

    l = $('#wnMinID').spinner('value');
    l2 = $('#wnMinpercentID').spinner('value');
    showCategoryTable('wnTable', wnPatterns, getLastFilter('wnTable'), l, l2);
    bestIOBPatterns();
	
	//finish
	analyseTrainingSet(4);
}

function bestPatterns(arr, limit) {

    // label: item.iob, counter:
    for(var item in arr){


	var c = arr[item], sum=0, interesting=false, bestRate = 0;
	for(var i=0; i<c.length; i++){
	    sum += c[i].counter;
	}
	for(var i=0; i<c.length; i++){
	    var r = c[i].counter / sum;
	    if (r > limit){
		interesting = true;
		//break;
	    }
	    if (r > bestRate) {
		bestRate = r;
	    }
	    c[i].rate = (100*c[i].counter/sum).toFixed(2);
	}
	if (!interesting) {
	    delete arr[item];
	}else
	    c.bestRate = (100*bestRate).toFixed(2);
    }

    //arr.sort(function(a,b) {	return parseFloat(a.bestRate) - parseFloat(b.bestRate);	} );
}

function bestIOBPatterns(){

    var o = "";
    for(var item in catPatterns){

	var c = catPatterns[item];
	if (c.length == 1) {
	    //B-NP: DT // 17807
	    o += c[0].label + ": " + item + " // " +c[0].counter + "\n";
	}
    }

    iobEditor.setValue(o);
}

function addExampleInfo(objId, data, se, exampleId){
	$(objId).append("<img src='images/"+(data.unique ? "status_ok.png": "status_x.png")+"'/>");


	var tooltipID = "tooltipID"+objId.replace('#', '');
	var cellID = "cell"+objId.replace('#', '');
	var html = '<span id="'+tooltipID+'">';
        html += ' <div class="ui-button"><span class="ui-icon ui-icon-info"></span></div></span>';

	html += ' <span class="ui-button" onclick="addPattern(\''+se+'\', \''+cellID+'\', true)" title="add pattern to grammar"><span class="ui-icon ui-icon-circle-plus"></span></span>';
	html += ' <span class="ui-button" onclick="addToTester('+exampleId+')" title="add pattern to rule tester (sid:'+trainSet[exampleId][0].sid+')"><span class="ui-icon ui-icon-arrowthickstop-1-e"></span></span>';

	html += ' <span class="ui-button" onclick="showAllPatternExamples(\''+se+'\')" title="show pattern"><span class="ui-icon ui-icon-comment"></span></span>';

	$(objId).append(html);

	if (data.unique && data.np) addPattern(se, '', false);
	addTooltip({id: tooltipID, parameters:data});

}

function checkNP(objId, se, exampleId){

    $(objId).addClass("ui-autocomplete-loading");

//    if ($(objId).is(":visible")){
//	$(objId).slideToggle();
//	$(link).find('span').removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-e');
//	return;
//    }

    //s = s.replace(/</g, "[").replace(/>/g, "]");

    var durl = "?task=check&s="+encodeURIComponent(se);
    //$.ajax
    $.ajaxQueue({type:"get",url:durl,success: function(data){

	$(objId).removeClass("ui-autocomplete-loading");

	addExampleInfo(objId, data, se, exampleId);
	//$(objId).append('<div id="qtip-0" class="qtip qtip qtip-shadow qtip-green" tracking="false" role="alert" aria-live="polite" aria-atomic="false" aria-describedby="qtip-0-content" aria-hidden="true" style="z-index: 15001;"><div class="qtip-tip" style="background-color: transparent ! important; border: 0px none ! important; height: 6px; width: 6px; line-height: 6px; left: 0px; top: -6px;"><canvas style="background-color: transparent ! important; border: 0px none ! important;" height="6" width="6"></canvas></div><div class="qtip-titlebar"><div id="qtip-0-title" class="qtip-title" aria-atomic="true">Paragraph details</div></div><div class="qtip-content" id="qtip-0-content" aria-atomic="true"><table class="tooltip">	<tbody><tr class="odd"><td class="attr">final class</td><td class="value">good</td></tr>	<tr class="even"><td class="attr">context-free class</td><td class="value">short</td></tr>	<tr class="odd"><td class="attr">heading</td><td class="value">True</td></tr>	<tr class="even"><td class="attr">length (in characters)</td><td class="value">21</td></tr>	<tr class="odd"><td class="attr">number of characters within links</td><td class="value">0</td></tr>	<tr class="even"><td class="attr">link density</td><td class="value">0.000000</td></tr>	<tr class="odd"><td class="attr">number of words</td><td class="value">3</td></tr>	<tr class="even"><td class="attr">number of stopwords</td><td class="value">1</td></tr>	<tr class="odd"><td class="attr">stopword density</td><td class="value">0.333333</td></tr>	<tr class="even"><td class="value" colspan="2">div.h1</td></tr>	<tr class="odd"><td class="value" colspan="2">0. paragraph</td></tr>	<tr class="even"><td class="value" colspan="2">reason of short: length &lt; 70 &amp;&amp; linked_char_count == 0</td></tr>	</tbody></table></div></div>');
	//$(link).find('span').removeClass('ui-icon-triangle-1-e').addClass('ui-icon-triangle-1-s');

    }});
}

function addPattern(s, cellID, calc){

    s = s.replace(/\[/g, "<").replace(/\]/g, ">");
    s = escapeRegExp(s);
//    $('#rules').val($('#rules').val()+'\n    '+s);
    appendTo(grammarEditor, "    "+s+"\n");

    if (calc){

	$( "#"+cellID ).effect( "transfer", { to: ".CodeMirror", className: "ui-effects-transfer" }, 900 ); //rules
	setTimeout(fullTest, 900);

	//fullTest();
    }
}

function addToTester(id) {
    //alert(testS[id]);
    currSentenceId = id;
    $('#pattabs').tabs({ active: 1 });
//    test([trainSet[id]]);
    checkSent();
}

function checkSent(){
//    test([trainSet[currSentenceId]]);
    prepareRules();
    var bad=0, ok=0, tp=0, fp=0, fn=0;
    test2('strict', [trainSet[currSentenceId]], 0, bad, ok, tp, fp, fn);
}

function escapeRegExp(string){
  //return string; //van benne regex!
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

    function getPosition(offset, posArr){
        for(var i=0; i<posArr.length; i++){
            if(offset < posArr[i]) {
                return i;
            }
        }
        return -1;
    }

    function getNP(s) {
        var r=[], currNP=[];
        for(var i=0; i<s.length; i++){
            var ch = s[i].iob[0];

	    //ENG
	    if (currNP.length && ch != 'I') {
		r.push({start:i/*+1*/-currNP.length, end:i-1}); //TODO: HUN +1, ENG 0
                currNP=[];
		if (ch == 'B') currNP.push(i);
		continue;
	    }

            if (ch == 'O'){
                if (currNP.length != 0){
                    //invalid, accept :)
                    r.push({start:i/*+1*/-currNP.length, end:i-1}); //TODO: HUN +1, ENG 0
                    currNP=[];
                }
            }else if (ch == '1') {
                r.push({start:i, end:i});
            }else if (ch == 'B' || ch == 'I') {
                currNP.push(i);
            }else if (ch == 'E') {
                currNP.push(i);
                r.push({start:i+1-currNP.length, end:i});
                currNP=[];
            }
        }
        return r;
    }

    function checkIOB(s) {
	return s; //ENG
        for(var i=0; i<s.length; i++){

            if (typeof s[i].strict != 'undefined' && s[i].strict) // itt !s[i].strict volt...
                continue; //ezt nem lehet felulbiralni

            var ch = s[i].iob[0];
            var next = 0;
            if (i+1<s.length) next = s[i+1].iob[0];
            var prev = i>0 ? s[i-1].iob[0] : 0;

            if (ch == 'O'){
                // ok
            }else if (ch == '1') {
                if (prev && prev != 'O'){
                    s[i].iob = 'I';
                }//else if (next && next != 'O') {
                   // s[i].iob = 'B';
                //}
            }else if (ch == 'B') {
                if (prev && prev != 'O'){
                    s[i].iob = 'I';
                }else if (next && next == 'O') {
                    s[i].iob = '1';
                }
            }else if (ch == 'I') {
                if (prev){
		    if (prev  == 'O'){
			if (next && next != 'O')
			    s[i].iob = 'B';
			else
			    s[i].iob = '1';
		    }else if (prev == '1') {
			s[i-1].iob = 'B'; //probaltam javitani
		    }
                }
		if (next){
		    if (next == 'O' || next == 'B')
			s[i].iob = 'E';
                }
            }else if (ch == 'E') {
                if (prev && prev  == 'O'){
                    if (next && next != 'O')
                        s[i].iob = 'B';
                    else
                        s[i].iob = '1';
                }else if (next && next == 'I') {
                    s[i].iob = 'I';
                }
            }
        }
        return s;
    }

    function evaluate(goldNP, NP){
        var sumGoldNP = goldNP.length;
        var tp = 0;

        for(var i=0; i<goldNP.length; i++){
            for(var j=0; j<NP.length; j++){
                if (goldNP[i].start == NP[j].start &&
                    goldNP[i].end == NP[j].end) {
                    tp++;
                    break;
                }
            }
        }

        var fp = NP.length - tp; //false_positives: NP-k szama amiket Hunchunk mondott de SZTB-ben nem volt benne
        var fn = Math.abs(sumGoldNP - tp); //false_negative: NP-k szama amik SZTB-ben benne voltak de Hunchunk nem mondt
        return {tp:tp, fp:fp, fn:fn};
    }

    function removeComment(str){
        var re = /\/\//;
        var m;

        if((m = re.exec(str)) != null) {
            //if (m.index === re.lastIndex) {
            //}
            return str.substr(0, m.index);
        }
        return str;
    }

    /**
        NP
            <Mc-snl><bra1><Ccsw><Mc-snl>     // chunk determiner/possessive, adjectives and noun
            (<Nc-sx>)+(?=<Ccsp>)             // chunk sequences of proper nouns

    */
    function parseRules(r){

        var lines = grammarEditor.getValue().split('\n'); //$('#rules').val().split('\n');

        var symbol = "";
        for(var i=0; i<lines.length; i++){

            lines[i] = removeComment(lines[i]);
	    var t = lines[i].trim();
            if (t == "") continue;
            if (lines[i].match(/^\S+/)) {
                symbol = lines[i].replace(':', '').trim();
                continue;
            }

            //rules
            r.push({'re':new RegExp(t, "g"), 'symbol':symbol, 'iob':''}); // ha hibas a regex

//            var f = lines[i].split('=>');
//            r.push({'category':f[0], 'iob':f[1]});
        }
    }

    function decodeTags(str){
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function commonPatterns(s){

        var hist = {}
        for(var i=0; i<s.length; i++){

            var goldNP = getNP(s[i]);
            for(var w=0; w<goldNP.length; w++){

                var npPattern = "";
                for(var n=goldNP[w].start; n<=goldNP[w].end; n++){
                    npPattern += "<" + s[i][n].mcategory + "> ";

	   // if (s[i][n].category == 'Pd3-sn' && s[i][n].stem == 'ez') {
	//	var tttt = 0;
	//   }

                }

                //npPattern = s[i][0].id + " " + npPattern;
                hist[npPattern] ? hist[npPattern].counter+=1 : hist[npPattern]={counter:1, exampleId:i};
            }
        }
        var h = []
        for(var e in hist)
            h.push({pattern:e, value:hist[e].counter, exampleId:hist[e].exampleId, good:0, bad:0});
        h.sort(function(a,b) {
            return b.value - a.value;
        });
	patterns = h;
        var html = "<table>";
        for(var i=0; i<h.length;i++){
            html += "<tr><td>"+h[i].value+"</td><td><div id='status"+i+"' class='notification'></div></td><td id='cellstatus"+i+"'>"+decodeTags(h[i].pattern)+"</td></tr>"; //
        }
        html += "</table>";
        $('#testpad2').html(html);

//        for(var i=0; i<h.length;i++){
//            checkNP("#status"+i, h[i].pattern, h[i].exampleId);
//        }
    }

    function setProgressValue(v) {
	progressValue = v;
    }

    function startProgress(){

	//$('#testProgressbar').addClass("ui-autocomplete-loading");

	setTimeout(function(){

	    fullTest();
	    $('#start').button( 'enable' );
	    //$('#testProgressbar').removeClass("ui-autocomplete-loading");
	}, 10);

	/*
	progress = setInterval(function()
	{//alert('kukkk');
	    $('#testProgressbar').progressbar( "value", progressValue);

	    if(progressValue > 99) {
		clearInterval(progress);
	    }
	}, 50);*/
    }

    var myrules, first;


    function fullTest() {
		prepareRules();

		var bad=0, ok=0, tp=0, fp=0, fn=0, tbad=0, tok=0, ttp=0, tfp=0, tfn=0;
		test2('train', trainSet, 0, bad, ok, tp, fp, fn);

		convertMacro(testSet);
		test2('test', testSet, 0, tbad, tok, ttp, tfp, tfn);
	}
	
    function prepareRules() {
        myrules = $('#r').is(":checked") ? iobEditor.getValue().split('\n') : []; //readonly editor: iobEditor.getValue().split('\n') or rules.slice(0)
        parseRules(myrules);

        first=true;
    }

    function test2(type, set, start, bad, ok, tp, fp, fn){




        for(var i=start; i<set.length; i++){

            var sentence="", pos=[], len=0, r_sentence=[];
            var goldNP = getNP(set[i]);
            for(var w=0; w<set[i].length; w++){
                sentence += "<" + set[i][w].mcategory + "> "; //m
                len += set[i][w].mcategory.length + 3; //m
                pos.push(len);
                //at full NP chunking:
		var c = "O";

		//only NP division:
		//var c = "I";
		//if (w == 0) c="B";
		//else if (w == set[i].length-1) c="E";
		r_sentence.push({"iob":c, "rule":[]});
            }

            for(var j=0; j<myrules.length; j++){

                var re, debugInfo = (type == 'strict' || type == 'train' && first);
                var customRule = typeof myrules[j].re != 'undefined';
                if (customRule) {
                    re = myrules[j].re;
                }else{
                    re = new RegExp(escapeRegExp("<"+myrules[j].category+">"), "g");
                }
                while ((m = re.exec(sentence)) != null) {
                    if (m.index === re.lastIndex) {
                        re.lastIndex++;
                    }

                //var r = re.exec(sentence);
                //if (r == null)
                //    continue;
                //for(var t=0; t<r.length; t++){
                    //r_sentence.push(r);
                    if (!customRule) {
			var p = getPosition(m.index, pos);
                        r_sentence[p].iob = myrules[j].iob;
			if (debugInfo) r_sentence[p].rule.push({type:'iobRule', r:re.source});
                    }else{
                        var p1 = getPosition(m.index, pos);
                        var p2 = getPosition(m.index+m[0].trim().length, pos);
                        if (p1 != p2) {
                            r_sentence[p1].iob = 'B';
                            r_sentence[p2].iob = 'I'; //'E';
			    r_sentence[p2].strict = 1;
			    if (debugInfo) r_sentence[p2].rule.push({type:'rule', r:re.source});
                        }else
                            r_sentence[p1].iob = 'B';//'1';
			r_sentence[p1].strict = 1;
			if (debugInfo) r_sentence[p1].rule.push({type:'rule', r:re.source}); //p1 always gets rule
                        for(var k=p1+1; k<p2; k++){
                            r_sentence[k].iob = 'I';
                            r_sentence[k].strict = 1;
			    if (debugInfo) r_sentence[k].rule.push({type:'rule', r:re.source});
                        }

                    }

                //
                }
            }
	//    var rr = checkIOB(r_sentence);
	//    if (rr != r_sentence) {
	//	alert('hm');
	//    }
            var NP = getNP(checkIOB(r_sentence));
            var e = evaluate(goldNP, NP);
            tp += e.tp;
            fp += e.fp;
            fn += e.fn;


            if (/*debugInfo*/type == 'strict' || type == 'train' && first && (e.fp > 0 || e.fn > 0)) {
                first =false;
                //elso rosszat kiirjuk vagy ha egyetlen mondatot tesztel
		putSentence2ruletest(set[i], r_sentence, sentence);
            }


                /*
                 *
                 *
                 *     tp += tmp_tp;
                                        fp += tmp_fp;
                                        fn += tmp_fn;

                         float prec = tp+fp==0 ? 0 : (float)(100*tp) / (tp + fp);
                float rec  = tp+fn==0 ? 0 : (float)(100*tp) / (tp + fn);
                float F = (prec + rec)==0 ? 0 : 2*prec*rec / (prec + rec);

                printf("\nprecision:%f\nrecall:%f\nF:%f\n", prec, rec, F);
                printf("\ttp: %ld, fp: %ld, fn: %ld\n", tp, fp, fn);
;
                 *
                 *for(var j=0; j<rules.length; j++){

                    if (s[i][w].category == rules[j].category) {
                        if (s[i][w].iob == rules[j].iob) {
                            ok++;
                        }else
                            bad++;
                    }
                }
            }*/

	    if (i % 200 == 0) {
			setTimeout(function(){
				test2(type, set, i+1, bad, ok, tp, fp, fn);
		    }, 50);
			$(type == 'test' ? '#testProgressbar' : '#trainProgressbar').progressbar( "value", Math.round(1000 * i/set.length) / 10);

			printResults(type, i, tp, fp, fn);
			return;
	    }

    }
	$('#testProgressbar').progressbar( "value", 100);
	$('#trainProgressbar').progressbar( "value", 100);
	printResults(type, set.length, tp, fp, fn);
    }

    function printResults(type, sum, tp, fp, fn){
        var prec = tp+fp==0 ? 0 : (100*tp) / (tp + fp);
        var rec  = tp+fn==0 ? 0 : (100*tp) / (tp + fn);
        var F = (prec + rec)==0 ? 0 : 2*prec*rec / (prec + rec);

//                printf("\nprecision:%f\nrecall:%f\nF:%f\n", prec, rec, F);
//                printf("\ttp: %ld, fp: %ld, fn: %ld\n", tp, fp, fn);

	var html = '<table><tr><td>precision:</td><td>' + prec.toFixed(2) + '</td></tr>';
	html += '<tr><td>recall:</td><td>' + rec.toFixed(2) + '</td></tr>';
	html += '<tr><td>F:</td><td>' + F.toFixed(2) + '</td></tr>';
	html += '<tr><td>sentences:</td><td>' + sum + '</td></tr>';
	html += '<tr><td rowspan="2"><small>(tp:' + tp + ', fn:' + fn + ', fp:' + fp + ')</small></td></tr></table>';
        var rid = '#trainResult';
	if (type == 'test') {
	    rid = '#testResult';
	}
	$(rid).html(html);
    }

    function putSentence2ruletest(sentenceArr, r_sentence, sentence){

	var html = "<table>", tooltips=[];
	for(var w=0; w<sentenceArr.length; w++){
	    var OK = sentenceArr[w].iob[0] == r_sentence[w].iob[0];
	    html += "<tr><td class='row'>" + w + ". </td><td>" + sentenceArr[w].word + "</td><td>" + sentenceArr[w].mcategory + "</td><td><span class='gold0'>" + sentenceArr[w].iob + "</span></td><td> <span class='"+(OK ? 'gold' : 'test')+"'>" + r_sentence[w].iob + "</span></td>";
	    //html += "<td>"+r_sentence[w].rule.join()+"</td></tr>";

	    if (r_sentence[w].rule.length > 0) {

		var tooltipID = 'rr' + w;
		html += '<td><span id="'+tooltipID+'">';
		html += ' <div class="ui-button"><span class="ui-icon ui-icon-info"></span></div></span></td></tr>';

		var rList = '', rType = -1, title='Used rules';
		for(var k=0; k<r_sentence[w].rule.length; k++){
		    if (rList != "") rList += ",";
		    rList += r_sentence[w].rule[k].r;
		    if (rType != -1 && rType != r_sentence[w].rule[k].type)
			rType = 'hibrid';
		    else
			rType = r_sentence[w].rule[k].type;
		}
		if (rType == 'iobRule') {
		    title = 'iob label rule';
		}else if (rType == 'hibrid') {
		    title = 'Used rules: iob rules + grammar rules';
		}
		var data = {unique: OK, freeStyle: true, tooltipTitle: title, content: decodeTags(rList)};
		tooltips.push({id: tooltipID, parameters:data});
	    }
	}
	html += "</table> <span class='row'>" + decodeTags(sentence) + "</span>";
	html += "<input type='button' href='#' onclick='checkSent()' value='test'/>";
	$('#testpad').html(html);

	for(var w=0; w<tooltips.length; w++){
	    addTooltip(tooltips[w]);
	}
    }

    function appendTo(editor, text) {
	editor.replaceRange(text, CodeMirror.Pos(editor.lastLine()));
    }

    function fillIobRules(r){
	// [{"category":"Afc-pn","iob":"1-N_1","sum":"15"},...
	var c = "";
	for(var i=0; i<r.length; i++){
	    //c += r[i].iob + ": " + r[i].category + " // " + r[i].sum + "\n";
	    appendTo(iobEditor, r[i].iob + ": " + r[i].category + " // " + r[i].sum + "\n");
	}
	//$('#iobRules').val(c);
    }
