
var details = [];

//include
$("head").append('<link rel="stylesheet" type="text/css" href="' + 'js/jquery.qtip.min.css' + '" />');
//$("head").append('<script type="text/javascript" src="' + 'js/jquery.min.js' + '"></script>');
//$("head").append('<script type="text/javascript" src="' + 'js/jquery.qtip.min.js' + '"></script>');


function getContent(id){
	for(var i=0; i<details.length; i++){
		if (details[i].id == id)
			return details[i].parameters;
	}
	return 0;
}

function resetTooltip(){
	details = []; //clean the tooltip data
}

function addTooltip(x) {
	details.push(x);
	initTooltip('#' + x.id);
}

function createBubble(c){
	var html = '';
	if (c == 0)
		return 'no tooltip text found';
	if (c.freeStyle) {
		return c.content;
	}
	var cl = c.unique?'green':'red';
	html += '<table class="tooltip '+cl+'">';
	html += '<tr><td class="theader">sid</td><td class="theader">surface</td><td class="theader">category</td><td class="theader">iob</td></tr>';

	for(i=0; i<c.rows.length; i++){
	    var surf="", cat="", iob="";
	    for(j=0; j<c.rows[i].words.length; j++){
		surf += c.rows[i].words[j] + " ";
		cat += c.rows[i].categories[j] + " ";
		iob += c.rows[i].iob[j] + " ";
	    }
	    html += '<tr class="'+(c.rows[i].good?'good':'bad')+'"><td>'+c.rows[i].sentence_id+'</td><td>'+surf+'</td><td>'+cat+'</td><td>'+iob+'</td></tr>';
	}
	html += '</table>';
	return html;
}

function initTooltip(id){
	// Match all <A/> links with a title tag and use it as the content (default).
	//'[qtip-content]'
	$(id).qtip(
	{
		//myContentObject: getContent($(this).attr('id')),
		content: {
			text: function(api) {
			// Retrieve content from custom attribute of the $('.selector') elements.
				var p = getContent($(this).attr('id'));
				$(this).qtip('option', 'style.classes', 'qtip-shadow qtip-' + (p.unique ? 'green' : 'red'));
				return createBubble(p);
			},
			title: {

				text: function(api) {
					var p = getContent($(this).attr('id'));
					return typeof p.freeStyle != 'undefined' && p.freeStyle ? p.tooltipTitle : 'Details';
				},
				button: false
			}
			//attr: 'id' // Use the ALT attribute of the area map for the content
		},
		style: {
			classes: //'qtip-shadow qtip-green'
			function(api) {
				var p = getContent($(this).attr('id'));
				if (p)
					return p.unique ? 'qtip-shadow qtip-green' : 'qtip-shadow qtip-red';
				return 'qtip-shadow qtip-green';
			// Retrieve content from custom attribute of the $('.selector') elements.
				//return getContent($(this).attr('qtip-content'));
			}
		},
		position: {
//			my: 'top-left',
//			at: 'bottom-left'
			//my: function(){ return this.context.localName=='a' ? 'top-left' : 'center'},
			//at: function(){ return this.context.localName=='a' ? 'bottom-left' : 'center'}
		}
	});
}
