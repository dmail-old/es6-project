/*
http://www.2ality.com/2015/04/node-es6-transpiled.html

imaginon que j eveuille m'en servir, le prob c'est que la version transpilé du module est ensuite

*/

(function(){

	var platform = {
		ready: function(listener){
			this.onready = listener;
		},

		onerror: function(error){
			console.error(String(error));
		}
	};

	var baseURL;

	if( typeof window !== 'undefined' ){
		platform.restart = function(){
			window.reload();
		};

		platform.include = function(url, done){
			var script = document.createElement('script');

			script.src = url;
			script.type = 'text/javascript';
			script.onload = function(){
				done();
			};
			script.onerror = function(error){
				done(error);
			};

			document.head.appendChild(script);
		};

		var agent = (function(){
			var ua = navigator.userAgent.toLowerCase();
			var regex = /(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/;
			var UA = ua.match(regex) || [null, 'unknown', 0];
			var name = UA[1] == 'version' ? UA[3] : UA[1];
			var version;

			// version
			if( UA[1] == 'ie' && document.documentMode ) version = document.documentMode;
			else if( UA[1] == 'opera' && UA[4] ) version = parseFloat(UA[4]);
			else version = parseFloat(UA[2]);

			return {
				name: name,
				version: version
			};
		})();

		baseURL = (function(){
			var href = window.location.href.split('#')[0].split('?')[0];
			var base = href.slice(0, href.lastIndexOf('/') + 1);

			return base;
		})();

		platform.type = 'browser';
		platform.global = window;
		platform.baseURL = baseURL;
		platform.name = agent.name;
		platform.version = agent.version;
		platform.os = navigator.platform.toLowerCase();

		platform.systemLocation = './node_modules/systemjs/dist/system.js';
	}
	else{
		platform.include = function(url, done){
			var error;

			try{
				require(url);
			}
			catch(e){
				error = e;
			}

			done(error);
		};

		platform.restart = function(){
			process.kill(2);
		};

		baseURL = (function(){
			var base = 'file://' + process.cwd();

			if( process.platform.match(/^win/) ){
				base = base.replace(/\\/g, '/');
			}
			if( base[base.length - 1] != '/' ){
				base+= '/';
			}

			return base;
		})();

		platform.type = 'process';
		platform.global = global;
		platform.baseURL = baseURL;
		platform.name = parseInt(process.version.match(/^v(\d+)\./)[1]) >= 1 ? 'iojs' : 'node';
		platform.version = process.version;
		// https://nodejs.org/api/process.html#process_process_platform
		// 'darwin', 'freebsd', 'linux', 'sunos', 'win32'
		platform.os = process.platform === 'win32' ? 'windows' : process.platform;

		platform.systemLocation = './lib/system.js';

		platform.global.require = function(module){
			return require(module);
		};
	}

	console.log(platform.name, platform.version);

	platform.global.platform = platform;

	var dependencies = [];

	dependencies.push({
		name: 'URLSearchParams',
		url: './node_modules/@dmail/url-search-params/index.js',
		condition: function(){
			return false === 'assign' in platform.global;
		}
	});

	dependencies.push({
		name: 'URL',
		url: './node_modules/@dmail/url/index.js',
		condition: function(){
			return false === 'URL' in platform.global;
		}
	});

	dependencies.push({
		name: 'Object.assign',
		url: './node_modules/@dmail/object-assign/index.js',
		condition: function(){
			return false === 'assign' in Object;
		}
	});

	dependencies.push({
		name: 'setImmediate',
		url: './node_modules/@dmail/set-immediate/index.js',
		condition: function(){
			return false === 'setImmediate' in platform.global;
		}
	});

	dependencies.push({
		name: 'Promise',
		url: './node_modules/@dmail/promise-es6/index.js',
		condition: function(){
			return false === 'Promise' in platform.global;
		}
	});

	dependencies.push({
		name: 'System',
		url: platform.systemLocation,
		condition: function(){
			return false === 'System' in platform.global;
		},
		instantiate: function(){
			System.transpiler = 'babel';
			System.paths.babel = './node_modules/babel-core/browser.js';
			System.babelOptions = {

			};

			if( platform.type === 'process' ){
				var replaceErrorStackUsingSourceMap = require('@dmail/source-map-node-error');
				var importMethod = System.import;
				System.import = function(){
					return importMethod.apply(this, arguments).catch(function(error){
						return Promise.reject(replaceErrorStackUsingSourceMap(error));
					});
				};
				//System.babelOptions.retainLines = true;
			}
		}
	});

	function includeDependencies(dependencies, callback){
		var i = 0, j = dependencies.length, dependency;

		function done(error){
			setImmediate(function(){
				callback(error);
			});
		}

		function includeNext(error){
			if( error ){
				console.log('include error', error);
				done(error);
			}
			else if( i === j ){
				console.log('all dependencies included');
				done();
			}
			else{
				dependency = dependencies[i];
				i++;

				if( !dependency.condition || dependency.condition() ){
					console.log('loading', dependency.name);
					platform.include(dependency.url, function(error){
						if( error ){
							includeNext(error);
						}
						else{
							if( dependency.instantiate ){
								dependency.instantiate();
							}
							includeNext();
						}
					});
				}
				else{
					console.log('skipping', dependency.name);
					includeNext();
				}
			}
		}

		includeNext();
	}

	includeDependencies(dependencies, function(error){
		if( error ) throw error;

		var importMethod = System.import;
		System.import = function(normalizedName){
			return importMethod.apply(this, arguments).catch(function(error){
				// faudrais exclude les erreur de réseau
				// sinon c'est forcément une erreur lié au code des certains modules
				//if( error.name === 'ReferenceError' || error.name === 'SyntaxError' ){
					platform.onerror(error);
				//}
				return Promise.reject(error);
			});
		};

		// process.on('uncaughtException', replaceErrorStackUsingSourceMap);
		// process.exit(1);

		System.import('./lib/fetch/fetch.js').then(function(exports){
			return exports.fetch('./config.json').then(function(response){
				return response.json();
			}).then(function(config){
				console.log('fetched config.json', config);
				platform.config  = config;
				platform.onready();
			}).catch(function(error){
				console.log('failed fetch', error.stack);
			});
		});
	});

})();