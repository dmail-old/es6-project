// sort of https://www.npmjs.com/package/pm2

import proto from './proto/index.js';
import * as argv from './argv.js';

var path = require('path');
var child_process = require('child_process');
var EventEmitter = require('events').EventEmitter;

var Worker = proto.extend({
	childProcess: child_process,
	state: 'created', // created, started, killed, restarting
	process: null,
	ctime: null,
	console: console,

	path: null,
	args: null,
	env: {},

	constructor: function(options){
		this.emitter = new EventEmitter();
		this.update(options);
	},

	update: function(options){
		Object.assign(this, options);
		if( this.state === 'started' ){
			this.restart();
		}
	},

	log: function(){
		this.console.log.apply(this.console, arguments);
	},

	warn: function(){
		this.console.warn.apply(this.console, arguments);
	},

	isWindows: function(){
		return process.platform === 'win32';
	},

	start: function(){
		if( this.state == 'started' || this.state == 'restarting' ){
			throw new Error('cannot start, wrong worker state' + this.state);
		}

		this.process = this.childProcess.fork(this.path, this.args, {
			cwd: path.dirname(this.path),
			env: this.env
		});
		this.ctime = Number(new Date());

		this.process.on('exit', this.onexit.bind(this));
		this.process.on('message', this.onmessage.bind(this));

		this.state = 'started';
		this.log('worker started :', this.path);
		this.emit('start');
	},

	stop: function(){
		this.kill(0);
	},

	restart: function(){
		if( this.state == 'started' ){
			this.state = 'restarting';
			if( this.isWindows() ){
				this.kill();
			}
			else{
				this.kill('SIGUSR2');
			}
		}
		else if( this.state != 'restarting' ){
			this.emit('restart');
			this.start();
		}
	},

	kill: function(signal){
		if( this.state === 'started' ){
			this.emit('kill', signal);
			this.process.kill(signal);
		}
	},

	onexit: function(code, signal){
		if( this.state == 'restarting' ) signal = 'SIGUSR2';
		// this is nasty, but it gives it windows support
		else if( this.isWindows() && signal == 'SIGTERM' ) signal = 'SIGUSR2';
		// asked to restart
		else if( code == 2 ) signal = 'SIGUSR2';

		this.process = null;
		this.state = 'killed';

		// exit the monitor, but do it gracefully
		if( signal == 'SIGUSR2' ){
			this.restart();
		}
		// clean exit - wait until file change to restart
		else if( code === 0 ){
			this.log('worker stopped :', this.path);
			this.emit('stop');
			this.emit('end');
		}
		else{
			this.console.error('worker crashed :', this.path);
			this.emit('crash');
			this.emit('end');
		}
	},

	send: function(message, handle){
		this.process.send(message, handle);
	},

	onmessage: function(message, handle){
		if( message.type ){
			this.emit(message.type, message.event);
		}
	}
});

['addListener', 'removeListener', 'emit', 'on'].forEach(function(method){
	Worker[method] = function(){
		return this.emitter[method].apply(this.emitter, arguments);
	};
});

var Work = proto.extend({
	path: '',
	options: {
		args: '',
		env: {},
		config: null,
		useLog: false
	},

	constructor: function(path, options){
		this.workers = [];
		options = options || {};

		this.setPath(path);
		this.baseOptions = options;
		this.setOptions(options);

		if( !options.config ) options.config = path + '.config.js';
		var configFile = options.config;
		try{
			configFile = require.resolve(configFile);
		}
		catch(e){
			// no config file
			configFile = null;
		}
		if( configFile ){
			this.observeFile(options);
			this.addOptions(require(options));
		}
	},

	setPath: function(value){
		this.path = path.resolve(process.cwd(), value);
	},

	setOptions: function(options){
		if( options.path ){
			this.setPath(options.path);
		}
		if( options.events ){
			Object.keys(options.events).forEach(function(eventName){
				this.addListener(eventName, options.events[eventName]);
			}, this);
		}
		if( options.args ){
			options.args = Object.assign({}, options.args);
		}

		this.options = options;
	},

	addOptions: function(options){
		if( this.hasOwnProperty('options') ){
			if( this.options.events ){
				Object.keys(options.events).forEach(function(eventName){
					this.removeListener(eventName, this.options.events[eventName]);
				}, this);
			}
		}

		options = Object.assign({}, this.baseOptions, options);
		this.setOptions(options);
	},

	propagate: function(method){
		this.workers.forEach(function(worker){
			worker[method]();
		});
	},

	createWorkerOptions: function(){
		return {
			path: this.path,
			args: argv.prepare(this.options.args),
			env: this.options.env
		};
	},

	onConfigChange: function(path){
		this.addOptions(require(path));

		this.workers.forEach(function(worker){
			worker.update(this.createWorkerOptions());
		}, this);
	},

	observeConfig: function(){
		//FileObserver.observe(path, this.onConfigChange, this);
	},

	unobserveConfig: function(){
		//FileObserver.unobserve(path, this.onConfigChange, this);
	},

	createWorker: function(){
		var worker = Worker.create(this.createWorkerOptions());

		this.workers.push(worker);

		return worker;
	},

	start: function(stopListener){
		var worker = this.fork();

		if( stopListener ) worker.on('stop', stopListener);
	},

	stop: function(){
		this.workers.forEach(function(worker){
			worker.stop();
		});
		this.workers.length = 0;
	},

	fork: function(){
		var worker = this.createWorker();
		worker.start();
		return worker;
	}
});

/*
var work;

function activatePrompt(){
	var readline = require('readline'), interface = readline.createInterface(process.stdin, process.stdout);

	interface.setPrompt('> ');
	interface.prompt();
	interface.on('line', function(line){
		var code = line.trim();

		try{
			console.log(eval(code));
		}
		catch(e){
			console.log(e.stack);
		}

		interface.prompt();
	});
	interface.on('close', function(){
		process.exit(0);
	});
}

function handleNativeError(error){
	require('fs').appendFileSync(process.cwd() + '/error.log', error.stack + '\n');
	console.log(error.stack);
	// no need to throw, but keep process alive and activate prompt for debug
	if( !work || !work.config.prompt ) activatePrompt();
}
*/

export default Work;