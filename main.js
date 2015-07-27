(function(){

	var platform = {
		main: 'module.js'
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

		platform.type = 'browser';
		platform.name = '';
		platform.os = navigator.platform.toLowerCase();

		platform.systemLocation = './node_modules/systemjs/dist/system.js';
	}
	else{
		platform.include = function(url, done){
			done(require(url));
		};

		platform.restart = function(){
			process.kill(2);
		};

		platform.type = 'process';
		platform.name = 'node';
		// https://nodejs.org/api/process.html#process_process_platform
		// 'darwin', 'freebsd', 'linux', 'sunos', 'win32'
		platform.os = process.platform === 'win32' ? 'windows' : process.platform;

		platform.systemLocation = './system.js';
	}

	platform.include(platform.systemLocation, function(){
		System.transpiler = 'babel';
		System.babelOptions = {
			//modules: 'system'
		};
		System.paths.babel = './node_modules/babel-core/browser.js';
		System.paths.proto = 'lib/proto/index.js';
		System.env = {};
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

		System.import(platform.main).then(console.log);
	});

})();