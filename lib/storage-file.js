import mimetype from './utils/mimetype.js';
import filesystem from './utils/filesystem.js';
import mkdirto from './utils/mkdir-to.js';
import { createResponsePromise, createBody } from './http/http.js';

var fs = require('fs');

function readFile(file){
	return filesystem('readFile', file);
}

function writeFile(file, content){
	return filesystem('writeFile', file, content);
}

function stripFileProtocol(url){
	if( url.indexOf('file:///') === 0 ){
		url = url.slice('file:///'.length);
	}
	return url;
}

function getRequestUrl(request){
	return stripFileProtocol(String(request.url));
}

export function createResponsePromiseForGet(request){
	var url = getRequestUrl(request), promise;

	promise = filesystem('stat', url).then(function(stat){
		// new Date request if modified-since peut échouer, dans ce cas renvoyer 400 bad request
		if( request.headers['if-modified-since'] && stat.mtime <= new Date(request.headers['if-modified-since']) ){
			return {
				status: 304,
				headers: {
					'last-modified': stat.mtime.toUTCString()
				}
			};
		}

		return {
			status: 200,
			headers: {
				'last-modified': stat.mtime.toUTCString(),
				'content-type': mimetype(url),
				'content-length': stat.size
			}
		};
	});

	if( request.method != 'HEAD' ){
		promise = promise.then(function(responseProperties){
			var stream = fs.createReadStream(url);
			responseProperties.body = createBody(stream);

			return responseProperties;
		});
	}

	promise = promise.catch(function(error){
		if( error ){
			if( error.code == 'ENOENT' ){
				return {
					status: 404
				};
			}
			// https://iojs.org/api/errors.html#errors_eacces_permission_denied
			if( error.code === 'EACCES' ){
				return {
					status: 403
				};
			}
			if( error.code === 'EPERM' ){
				return {
					status: 403
				};
			}
			// file access may be temporarily blocked (by an antivirus scanning it because recently modified for instance)
			if( error.code === 'EBUSY' ){
				return {
					status: 503,
					headers: {
						'retry-after': 0.01 // retry in 10ms
					}
				};
			}
			// emfile means there is too many files currently opened
			if( error.code === 'EMFILE' ){
				return {
					status: 503,
					headers: {
						'retry-after': 0.1 // retry in 100ms
					}
				};
			}
		}
		return Promise.reject(error);
	});

	/*
	promise = promise.catch(function(error){
		if( error ){
			return {
				status: 500,
				body: error
			};
		}

		return {
			status: 500
		};
	});
	*/

	return promise;
}

export function createResponsePromiseForSet(request){
	var url = getRequestUrl(request), promise;

	// faudrais renvoyer last-modified, size et tout non?
	promise = mkdirto(url).then(function(){
		return request.body.pipe(fs.createWriteStream(url)).then(function(){
			return {
				status: 200
			};
		});
	});

	return promise;
}

export var methods = {
	get(options){
		return createResponsePromise(createResponsePromiseForGet, options);
	},

	post(options){
		return createResponsePromise(createResponsePromiseForSet, options);
	}
};