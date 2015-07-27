/*
https://developer.mozilla.org/en-US/docs/Web/API/Headers
https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
*/

import proto from 'proto';
import implement from '../iterator/implement.js';

function normalizeName(headerName){
	headerName = String(headerName);
	if( /[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(headerName) ){
		throw new TypeError('Invalid character in header field name');
	}

	return headerName.toLowerCase();
}

function normalizeValue(headerValue){
	return String(headerValue);
}

// https://gist.github.com/mmazer/5404301
function parseHeaders(headerString){
	var headers = {}, pairs, pair, index, i, j, key, value;

	if( headerString ){
		pairs = headerString.split('\r\n');
		i = 0;
		j = pairs.length;
		for(;i<j;i++){
			pair = pairs[i];
			index = pair.indexOf(': ');
			if( index > 0 ){
				key = pair.slice(0, index);
				value = pair.slice(index + 2);
				headers[key] = value;
			}
		}
	}

	return headers;
}

function checkImmutability(headers){
	if( headers.guard === 'immutable' ){
		throw new TypeError('headers are immutable');
	}
}

var HttpHeaders = proto.extend({
	guard: 'none', // immutable

	constructor: function(headers){
		this.headers = new Map();

		if( headers ){
			if( typeof headers === 'string' ){
				headers = parseHeaders(headers);
			}

			if( HttpHeaders.isPrototypeOf(headers) ){
				headers.forEach(this.append, this);
			}
			else if( Symbol.iterator in headers ){
				for( let header of headers ){
					this.append(header[0], header[1]);
				}
			}
			else if( typeof headers === 'object' ){
				for( let name in headers ){
					this.append(name, headers[name]);
				}
			}
		}
	},

	has: function(name){
		name = normalizeName(name);
		return name in this.headers;
	},

	get: function(name){
		name = normalizeName(name);
		return this.headers.has(name) ? this.headers.get()[0] : null;
	},

	getAll: function(name){
		name = normalizeName(name);
		return this.headers.has(name) ? this.headers.get(name) : [];
	},

	set: function(name, value){
		checkImmutability(this);

		name = normalizeName(name);
		value = normalizeValue(value);
		this.headers.set(name, [value]);
	},

	append: function(name, value){
		checkImmutability(this);

		name = normalizeName(name);
		value = normalizeValue(value);

		var values;

		if( this.headers.has(name) ){
			values = this.headers.get(name);
		}
		else{
			values = [];
		}

		values.push(value);
		this.headers.set(name, values);
	},

	combine: function(name, value){
		if( this.headers.has(name) ){
			value = ', ' + normalizeValue(value);
		}

		return this.append(name, value);
	},

	delete: function(name){
		checkImmutability(this);

		name = normalizeName(name);
		return this.headers.delete(name);
	},

	forEach: function(fn, bind){
		for( let [headerName, headerValues] of this ){
			headerValues.forEach(function(headerValue){
				fn.call(bind, headerName, headerValue);
			});
		}
	},

	toJSON: function(){
		return this.headers;
	},

	toString: function(){
		var headers = [];

		for( let [headerName, headerValues] of this ){
			headers.push(headerName + ': ' + headerValues.join());
		}

		return headers.join('\r\n');
	}
});

implement(HttpHeaders, 'headers', true);

export { HttpHeaders };
export default HttpHeaders;