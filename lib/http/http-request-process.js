import proto from 'proto';
import DuplexStream from './duplex-stream.js';
import HttpRequest from './http-request.js';

export var ProcessHttpRequest = proto.extend.call(HttpRequest, {
	headers: {
		'user-agent': System.platform.name,
		'origin': System.platform.baseURL
	},

	connect: function(){
		var http = System._nodeRequire('http');
		var https = System._nodeRequire('https');

		var url, isHttps, httpRequest, options;

		url = this.currentUrl;
		isHttps = url.protocol === 'https:';

		options = {
			method: this.method,
			host: url.hostname,
			port: url.port || (isHttps ? 443 : 80),
			path: url.pathname + url.search,
			headers: this.headers.toJSON()
		};

		httpRequest = (isHttps ? https : http).request(options);
		this.body.pipeTo(httpRequest);

		var promise = new Promise(function(resolve, reject){

			httpRequest.on('error', function(e){
				reject(e);
			});

			httpRequest.on('response', function(incomingMessage){
				resolve({
					status: incomingMessage.statusCode,
					headers: incomingMessage.headers,
					body: DuplexStream.create(incomingMessage)
				});
			});

		});

		return {
			promise: promise,

			setTimeout: function(timeout, listener){
				httpRequest.setTimeout(timeout);
				httpRequest.on('timeout', function(){
					httpRequest.close();
					listener();
				});
			},

			abort: function(){
				httpRequest.abort();
				httpRequest.removeAllListeners('response');
			}
		};
	}
});

export default ProcessHttpRequest;