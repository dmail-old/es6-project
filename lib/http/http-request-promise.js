import proto from 'proto';
import HttpRequest from './http-request.js';

export var HttpPromiseRequest = proto.extend.call(HttpRequest, {
	createPromise: function(request){
		throw new Error('unimplemented createPromise()');
	},

	connect: function(){
		return {
			promise: this.createPromise(this),
			setTimeout: setTimeout,
			abort: function(){}
		};
	}
});

export default HttpPromiseRequest;