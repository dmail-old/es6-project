(function(){

	var platform = {
		ready: function(listener){
			this.onready = listener;
		}
	};

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

		platform.type = 'browser';
		platform.global = window;
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

		platform.type = 'process';
		platform.global = global;
		platform.name = 'node';
		platform.version = process.version;
		// https://nodejs.org/api/process.html#process_process_platform
		// 'darwin', 'freebsd', 'linux', 'sunos', 'win32'
		platform.os = process.platform === 'win32' ? 'windows' : process.platform;

		platform.systemLocation = './lib/system.js';

		platform.global.require = function(module){
			return require(module);
		};
	}

	platform.global.platform = platform;

	var dependencies = [];

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
				System.babelOptions.retainLines = true;
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

		System.paths.proto = 'lib/proto/index.js';
		System.platform = platform;

		var importMethod = System.import;
		System.import = function(normalizedName){
			return importMethod.apply(this, arguments).catch(function(error){
				setTimeout(function(){
					throw error;
				}, 0);
				console.log('import error', 'System.get()', System.failed[0]);
				return Promise.reject(error);
			});
		};

		platform.onready();
	});

})();