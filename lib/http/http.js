import proto from '../proto/index.js';
import HttpHeaders from './http-headers.js';
import DuplexStream from './duplex-stream.js';
import HttpRequest from './http-request.js';
import HttpPromiseRequest from './http-request-promise.js';
import HttpBrowserRequest from './http-request-browser.js';
import HttpProcessRequest from './http-request-process.js';

import HttpResponse from './http-response.js';
import HttpClient from './http-client.js';

var HttpPlatformRequest = typeof window === 'undefined' ? HttpProcessRequest : HttpBrowserRequest;

//export { HttpPlatformRequest };

export var cache = HttpClient.cache;

export function createHeaders(init){
	return HttpHeaders.create(init);
}

export function createBody(init){
	return DuplexStream.create(init);
}

export function createResponse(){
	return HttpResponse.create();
}

export function createRequest(options){
	return HttpPlatformRequest.create(options);
}

export function createClient(request){
	return HttpClient.create(request);
}

export function createResponsePromiseFromClient(client){
	client.open();
	return Promise.resolve(client);
}

export function createPromiseRequest(promiseFactory, options){
	var CustomPromiseRequest = proto.extend.call(HttpPromiseRequest, {
		createPromise: promiseFactory
	});

	var request = CustomPromiseRequest.create(options);

	return request;
}

export function createResponsePromiseFromRequest(request){
	var client = createClient(request);
	return createResponsePromiseFromClient(client);
}

export function createResponsePromise(item){
	if( HttpClient.isPrototypeOf(item) ){
		return createResponsePromiseFromClient(item);
	}
	else if( HttpRequest.isPrototypeOf(item) ){
		return createResponsePromiseFromRequest(item);
	}
	else if( typeof item === 'function' ){
		return createResponsePromise(createPromiseRequest(item, arguments[1]));
	}
	else{
		return createResponsePromise(createRequest(item));
	}
}