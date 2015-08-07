/* globals debug */

import proto from '../proto/index.js';
import '../object-complete.js';
import '../../node_modules/@dmail/url/index.js';
import URLSelector from './url-selector.js';

var libLocation = 'lib';
var httpModuleLocation = libLocation + '/http/http.js';

var Storage = proto.extend({
	name: undefined,
	url: null,
	urlSelector: null,
	methods: {},

	constructor: function(store, options){
		this.store = store;
		Object.assign(this, options);
		this.urlSelector = URLSelector.create(options.url);
	},

	get: function(method){
		method = String(method).toLowerCase();

		if( method in this.methods ) return this.methods[method];
		if( '*' in this.methods ) return this.methods['*'];

		return null;
	},

	fetch: function(options){
		return this.import().then(methods => {
			this.methods = methods;
		}).then(value => {
			var handler = this.get(options.method);

			if( handler ){
				return handler(options);
			}
			else{
				throw new Error('method not found : ' + options.method + ' for storage ' + this.name);
			}
		});
	}
});

var store = {
	storages: [],

	createStorage: function(options){
		return Storage.create(this, options);
	},

	find: function(fn, bind){
		var storages = this.storages, i = 0, j = storages.length, storage;

		for(;i<j;i++){
			storage = storages[i];

			if( fn.call(bind, storage, i, storages) ){
				break;
			}
			else{
				storage =null;
			}
		}

		return storage;
	},

	findByName: function(name){
		return this.find(function(storage){
			return storage.name === name;
		});
	},

	findByURL: function(location){
		location = new URL(location);

		var storage = this.find(function(storage){
			return storage.urlSelector.match(location);
		});

		if( !storage ){
			throw this.createStorageNotFoundError(location);
		}

		return storage;
	},

	createStorageNotFoundError: function(location){
		var error = new Error(location + ' has no associated storage');
		return error;
	},

	fetch: function(url, options){
		url = new URL(url, platform.baseURL);

		var requestOptions = Object.assign({}, options, {url: url});

		try{
			return this.findByURL(url).fetch(requestOptions);
		}
		catch(e){
			return Promise.reject(e);
		}
	},

	GET: function(location, options = {}){
		Object.complete(options, {method: 'GET'});
		return this.fetch(location, options);
	},

	POST: function(location, body, options = {}){
		Object.complete(options, {method: 'POST', body: body});
		return this.fetch(location, options);
	}
};

var storages = [];

// http
storages.push({
	name: 'http',

	url: {
		protocol: 'http'
	},

	import: function(){
		return System.import(httpModuleLocation).then(function(http){
			return {
				'*': function(options){
					return http.createResponsePromise(options);
				}
			};
		});
	}
});

// https
storages.push({
	name: 'https',

	url: {
		protocol: 'https'
	},

	import: function(){
		return System.import(httpModuleLocation).then(function(http){
			return {
				'*': function(options){
					return http.createResponsePromise(options);
				}
			};
		});
	}
});

// file
storages.push({
	name: 'file',

	url: {
		protocol: 'file'
	},

	import: platform.type === 'process' ? function(){
		return System.import(libLocation + '/storage-file.js').then(function(exports){
			return exports.methods;
		});
	} : function(){
		return System.import(httpModuleLocation).then(function(http){
			return {
				'get': function(options){
					return http.createResponsePromise(options).then(function(response){
						// fix for browsers returning status == 0 for local file request
						if( response.status === 0 ){
							response.status = response.body ? 200 : 404;
						}
					});
				}
			};
		});
	}
});

store.storages = storages.map(function(storage){
	return store.createStorage(storage);
}).sort(function(a, b){
	return b.urlSelector.toNumber() - a.urlSelector.toNumber();
});

export { store };

export function fetch(url, options = {}){
	Object.complete(options, {method: 'GET'});
	return store.fetch(url, options);
}

export default fetch;