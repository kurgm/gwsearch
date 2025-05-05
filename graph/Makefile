all: dag.txt

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - dump_newest_only.txt

graph_dump.txt: dump_newest_only.txt
	node build_graph_dump.js $< $@

alias_dump.txt: dump_newest_only.txt
	node build_alias_dump.js $< $@

alias_cdp.txt:
	node fetch_alias_cdp.js $@

ids.txt:
	wget -O $@ https://github.com/mandel59/babelstone-ids/raw/main/IDS.TXT

graph_ids.txt: ids.txt
	node build_graph_ids.js $< $@

graph_ids_cdp.txt: ids-cdp.txt
	node build_graph_ids.js $< $@

graph_ids_misc.txt: ids-misc.txt
	node build_graph_ids.js $< $@

graph_merged.txt: graph_dump.txt graph_ids.txt graph_ids_cdp.txt graph_ids_misc.txt
	cat $^ > $@

alias_merged.txt: alias_cdp.txt alias_dump.txt alias_bs-uc-cdp.txt
	cat $^ > $@

dag.txt: graph_merged.txt alias_merged.txt
	node build_dag.js $^ $@

clean:
	-rm *.txt

.PHONY: all clean
