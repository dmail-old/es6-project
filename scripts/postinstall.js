var filesystem = require('jsenv/utils/filesystem');
var hasdir = require('jsenv/utils/has-dir');
var hasfile = require('jsenv/utils/has-file');
var symlink = require('jsenv/utils/symlink');
var exec = require('jsenv/utils/exec');
var mkdirto = require('jsenv/utils/mkdir-to');
var path = require('path');
var url = require('url');
var cwd = process.cwd();

function getLocation(location){
	return path.resolve(cwd, location);
}

function cloneRepo(repositoryURL, directory){
	directory = String(directory);

	return mkdirto(directory).then(function(){
		directory = path.dirname(directory);

		console.log('git clone', repositoryURL, 'into', directory);
		return exec('git clone' + repositoryURL, {
			cwd: directory
		});
	});
}

function createFile(location, content){
	return hasfile(location).then(function(hasFile){
		if( !hasFile ) return filesystem('write', location, '');
	});
}

var projectConfig = getLocation('./config.json');
var localConfig = getLocation('./config-local.json');

/*
promise = promise.then(function(){
	return createFile(projectConfig, '');
});

promise = promise.then(function(){
	return createFile(localConfig, '');
});

var config = JSON.parse(require('fs').readFileSync('./config.json'));
var cloneDestination = config['gitclone-path'];
var promise = Promise.resolve();

if( config['gitclone-path'] ){
	var cloneDestination = getLocation(config['gitclone-path']);
	var registry = config['registry-url'];

	promise = promise.then(function(){
		return filesystem('readFile', registry).then(JSON.parse);
	});

	// à ne pas faire en mode production, seulement en mode dev
	promise = promise.then(function(modules){
		return Promise.all(
			modules.map(function(module){
				var origin = url.parse(module.origin);

				// for modules from github
				if( origin.hostname !== 'github.com' ) return;

				var name = module.name;
				var from = module.origin;
				var to = cloneDestination + origin.pathname;
				var link = module.source;

				return hasdir(to).then(function(has){
					if( has ){
						return hasdir(to + '/.git').then(function(hasGit){
							if( hasGit ){
								console.log('git clone', from, 'aborted : already cloned');
							}
							else{
								console.log('git clone', from, 'aborted : directory exists');
							}
						});
					}
					return cloneRepo(from, to);
				}).then(function(){
					return symlink(to, getLocation(link));
				});
			})
		);
	});
}

promise.catch(function(error){
	setImmediate(function(){
		throw error;
	});
});
*/