// https://developer.mozilla.org/en-US/docs/Web/API/Response

import proto from '../proto/index.js';
import DuplexStream from './duplex-stream.js';
import HttpHeaders from './http-headers.js';
import HttpBody from './http-body.js';

export var HttpResponse = proto.extend(HttpBody, {
	status: 0,
	headers: {},
	body: null,

	cacheState: 'none', // 'local', 'validated', 'partial'

	constructor: function(options){
		options = options || {};

		Object.assign(this, options);

		this.headers = new HttpHeaders(this.headers);
	},

	clone: function(){
		var cloneResponse = new this.constructor({
			status: this.status,
			headers: this.headers.toJSON(),
			cacheState: this.cacheState
		});

		if( this.body ){
			var out = this.body.tee();
			this.body = out[0];
			cloneResponse.body = out[1];
		}

		return cloneResponse;
	}
});

export default HttpResponse;