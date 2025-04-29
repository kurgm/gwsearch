all: dag.txt

dump_newest_only.txt:
	wget -q -O - https://glyphwiki.org/dump.tar.gz | tar xvzf - dump_newest_only.txt

graph_dump.txt: dump_newest_only.txt
	node build_dump.js $< $@

alias_dump.txt: dump_newest_only.txt
	node build_alias_dump.js $< $@

ids-cdp.txt:
	wget -O $@ https://github.com/cjkvi/cjkvi-ids/raw/master/ids-cdp.txt

ids-ext-cdef.txt:
	wget -O $@ https://github.com/cjkvi/cjkvi-ids/raw/master/ids-ext-cdef.txt

graph_ids.txt: ids-cdp.txt
	node build_ids.js $< $@

graph_ids_cdef.txt: ids-ext-cdef.txt
	node build_ids.js $< $@

graph_merged.txt: graph_dump.txt graph_ids.txt graph_ids_cdef.txt
	cat $^ > $@

alias_merged.txt: alias_dump.txt
	cat $^ > $@

dag.txt: graph_merged.txt alias_dump.txt
	node build_dag.js $^ $@

clean:
	-rm *.txt

.PHONY: all clean
