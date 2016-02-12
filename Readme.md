# NP chunker preprocessor online toolkit


online demo: http://pi.itk.ppke.hu/~pisti/nprules/

Fine tuning features for NP chunking is a difficult task. The effects of a modification are sometimes unpredictable. Feature selection/tuning is usually made in trial-and-error style with long iterating times.
Thus, an online toolkit was developed, which addresses three tasks: (1) it can investigate a training corpus made for NP chunking, (2) it makes POS feature suggestions for better NP chunking, and finally (3) the new dataset can be exported. The kit automatically counts an approximated F-score on the fly, as a quick feedback to the linguist.
The kit was tested on English and Hungarian corpora. It proved to be able to accelerate preparing datasets for NP chunking effectively, and it gives useful POS feature suggestions from WordNet, resulting in better F-scores.
The toolkit needs only a browser (no dependency, nothing to install), and it is easy to use even for non-technical users.  
The development of features can be controlled in a user friendly way. The tool combines the abstraction ability of a linguist and the power of a statistical engine.

## references:

If you use the tool, please cite the following paper:

Istvan Endredy, 2015, Improving chunker performance using a web-based semi-automatic training data analysis tool, Poznan

```
@inproceedings{endrule,
  author = {Endr\'edy, Istv\'an},
  booktitle = {7th Language \& Technology Conference: Human Language Technologies as a Challenge for Computer Science and Linguistics},
  editor = {Zygmunt Vetulani; Joseph Mariani},
  isbn = {978-83-932640-8-7},
  publisher = {Pozna\'n: Uniwersytet im. Adama Mickiewicza w Poznaniu},
  title = {Improving chunker performance using a web-based semi-automatic training data analysis tool},
  page = {80--84},
  year = 2015
}
```


CoNLL2000 corpus: 
```
@inproceedings{TjongKimSang:2000:ICS:1117601.1117631,
author = {Tjong Kim Sang, Erik F. and Buchholz, Sabine},
title = {Introduction to the {CoNLL}-2000 Shared Task: Chunking},
booktitle = {Proceedings of the 2Nd Workshop on Learning Language in Logic and the 4th CoNLL - Volume 7},
series = {ConLL '00},
year = {2000},
location = {Lisbon, Portugal},
pages = {127--132},
numpages = {6},
url = {\url{http://dx.doi.org/10.3115/1117601.1117631}},
doi = {10.3115/1117601.1117631},
acmid = {1117631},
publisher = {ACL},
address = {Stroudsburg, PA, USA},
}
```