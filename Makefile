.PHONY: all

all: clean build

clean:
	rm -rf build

install:
	npm install

build:
	mkdir -p build
	node_modules/.bin/jade -o build index.jade
	cp fsk.js build/fsk.js
	cp -r deps/* build/

dev_server: clean build
	node_modules/.bin/serve build

