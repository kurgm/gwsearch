all: dag.txt

dump_newest_only.txt:
	wget -O - https://glyphwiki.org/dump.tar.gz | tar -xvf - dump_newest_only.txt

graph_dump.txt: dump_newest_only.txt
	node build_dump.js $< $@

ids-cdp.txt:
	wget -O $@ https://github.com/cjkvi/cjkvi-ids/raw/master/ids-cdp.txt

graph_ids.txt: ids-cdp.txt
	node build_ids.js $< $@

graph_merged.txt: graph_dump.txt graph_ids.txt
	cat $^ > $@

dag.txt: graph_merged.txt
	node build_dag.js $< $@

clean:
	-rm *.txt

.PHONY: all clean
