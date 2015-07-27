import proto from 'proto';
import HttpHeaders from './http-headers.js';
import DuplexStream from './duplex-stream.js';
import HttpRequest from './http-request.js';
import HttpPromiseRequest from './http-request-promise.js';
import HttpBrowserRequest from './http-request-browser.js';
import HttpProcessRequest from './http-request-process.js';

import HttpResponse from './http-response.js';
import HttpClient from './http-client.js';

var HttpPlatformRequest = typeof window === 'undefined' ? HttpProcessRequest : HttpBrowserRequest;

export { HttpPlatformRequest };

export var http = {
	cache: HttpClient.cache,

	createHeaders: function(init){
		return HttpHeaders.create(init);
	},

	createBody: function(init){
		return DuplexStream.create(init);
	},

	createRequest: function(options){
		return HttpPlatformRequest.create(options);
	},

	createResponse: function(){
		return HttpResponse.create();
	},

	createClient: function(request){
		return HttpClient.create(request);
	},

	createPromiseRequest: function(promiseFactory, options){
		var CustomPromiseRequest = proto.extend.call(HttpPromiseRequest, {
			createPromise: promiseFactory
		});

		var request = CustomPromiseRequest.create(options);

		return request;
	},

	createResponsePromiseFromClient: function(client){
		client.open();
		return Promise.resolve(client);
	},

	createResponsePromiseFromRequest: function(request){
		var client = this.createClient(request);
		return this.createResponsePromiseFromClient(client);
	},

	createResponsePromise: function(item){
		if( HttpClient.isPrototypeOf(item) ){
			return this.createResponsePromiseFromClient(item);
		}
		else if( HttpRequest.isPrototypeOf(item) ){
			return this.createResponsePromiseFromRequest(item);
		}
		else if( typeof item === 'function' ){
			return this.createResponsePromise(this.createPromiseRequest(item, arguments[1]));
		}
		else{
			return this.createResponsePromise(this.createRequest(item));
		}
	}
};

export default http;