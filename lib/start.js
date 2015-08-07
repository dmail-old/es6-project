import proto from './proto/index.js';
import Server from './server.js';
import Work from './work.js';
import sse from './sse.js';
import fileWatcher from './fs-watch.js';
import {createResponsePromiseForGet, createResponsePromiseForSet} from './storage-file.js';

var path = require('path');
var url = require('url');
var open = require('open');
var fs = require('fs');
var cwd = process.cwd();

var config = platform.config;
var serverURL = platform.config['server-url'];
var openBrowser = platform.config['open-browser'];

function createFileSystemServer(serverUrl){
	var server = Server.create(serverUrl);
	var filesystemRoom = sse.create();

	server.on('error', function(e){
		console.log('server error :', e);
		process.stdin.resume(); // pause to get the error
	});

	server.on('open', function(){
		console.log('server opened :', serverUrl);
		filesystemRoom.open();
	});

	server.on('close', function(){
		filesystemRoom.close();
		console.log('server closed :', serverUrl);
	});

	function addOptionHeaders(headers){
		Object.assign(headers, {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'].join(', '),
			'access-control-allow-headers': ['x-requested-with', 'content-type', 'accept'].join(', '),
			'access-control-max-age': 1 // Seconds
		});
	}

	server.on('request', function(clientRequest, serverResponse){
		var responsePromise;

		console.log(clientRequest.method, clientRequest.url);

		if( clientRequest.method === 'OPTIONS' ){
			responsePromise = Promise.resolve({
				status: 204,
				headers: {
					'content-length': 0
				}
			});
		}
		else if( clientRequest.headers && clientRequest.headers.accept === 'text/event-stream' &&
			clientRequest.url.indexOf('filesystem-events') !== -1 ){

			var lastEventId = clientRequest.headers['last-event-id'] || url.parse(clientRequest.url, true).query['lastEventId'];

			clientRequest.socket.setNoDelay(true);
			clientRequest.connection.on('close', function(){
				filesystemRoom.remove(serverResponse);
			});

			responsePromise = Promise.resolve(filesystemRoom.add(serverResponse, lastEventId));
		}
		else if( clientRequest.method === 'GET' || clientRequest.method === 'HEAD' ){
			var filePath = path.resolve(cwd, '.' + url.parse(clientRequest.url).pathname);

			// unauthorized
			if( filePath.indexOf(cwd + '/app/server') === 0 ){
				responsePromise = Promise.resolve({
					status: 403
				});
			}
			else{
				console.log('the file path is', path.normalize(filePath));

				responsePromise = createResponsePromiseForGet({
					url: filePath,
					method: clientRequest.method,
					headers: clientRequest.headers
				}).then(function(responseProperties){
					// watch only if file exists
					if( responseProperties.status === 200 || responseProperties.status === 304 ){
						//console.log('watching', filePath);

						fileWatcher.watch(filePath, function(filePath){
							//console.log('file modified:', filePath);
							var fileName = path.relative(process.cwd(), filePath);

							fileName = fileName.replace(/\\/g, '/');
							if( fileName[0] != '/' ) fileName = '/' + fileName;
							if( fileName[0] != '.' ) fileName = '.' + fileName;

							//console.log(fileName, 'was modified');

							filesystemRoom.sendEvent('change', fileName);
						});

						// chrome is caching file
						responseProperties.headers['cache-control'] = 'no-cache';
					}

					return responseProperties;
				});
			}
		}
		else if( clientRequest.method === 'POST' ){
			responsePromise = createResponsePromiseForSet({
				url: path.resolve(cwd, '.' + url.parse(clientRequest.url).pathname),
				method: clientRequest.method,
				headers: clientRequest.headers,
				body: clientRequest
			});
		}
		else{
			responsePromise = Promise.resolve({
				status: 501
			});
		}

		responsePromise.then(function(responseProperties){
			if( false === 'headers' in responseProperties ) responseProperties.headers = {};

			addOptionHeaders(responseProperties.headers);

			serverResponse.writeHead(responseProperties.status, responseProperties.headers);

			var keepAlive = responseProperties.headers['connection'] === 'keep-alive';

			if( responseProperties.body ){
				if( responseProperties.body.pipeTo ){
					return responseProperties.body.pipeTo(serverResponse);
				}
				else if( responseProperties.body.pipe ){
					responseProperties.body.pipe(serverResponse);
				}
				else{
					serverResponse.write(responseProperties.body);
					if( false === keepAlive ){
						serverResponse.end();
					}
				}
			}
			else if( false === keepAlive ){
				serverResponse.end();
			}

		}).catch(function(e){
			serverResponse.writeHead(500);
			serverResponse.end(e ? e.stack : '');
		});
	});

	return server;
}

var server = createFileSystemServer(serverURL);

var work = Work.create('./index.js', {
	args: [serverURL, '--silent']
});

server.on('open', function(){
	work.start(server.close.bind(server));

	if( openBrowser ){
		open(serverURL + '/index.html');
	}
});

server.on('close', function(){
	work.stop();
});

server.open();