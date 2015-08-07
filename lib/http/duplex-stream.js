// https://streams.spec.whatwg.org/
// https://streams.spec.whatwg.org/#rs-model
// http://jakearchibald.com/2015/thats-so-fetch/
import proto from '../proto/index.js';

function isNodeStream(a){
	if( platform.type !== 'process' ) return false;

	var stream = require('stream');

	return a instanceof stream.Stream || a instanceof stream.Writable;
}

export var DuplexStream = proto.extend({
	constructor(data){
		this.buffers = [];
		this.length = 0;
		this.pipes = [];
		this.state = 'opened';

		this.promise = new Promise(function(resolve, reject){
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));

		// object data types
		if( data && typeof data === 'object' ){
			// node readable streams
			if( isNodeStream(data) ){
				var Stream = require('stream').PassThrough;
				var passStream = new Stream();

				passStream.on('data', this.write.bind(this));
				passStream.on('end', this.close.bind(this));
				data.on('error',  this.error.bind(this));

				data.pipe(passStream);
			}
			else if( DuplexStream.isPrototypeOf(data) ){
				data.pipeTo(this);
			}
			else{
				throw new TypeError('unsupported stream data ' + data);
			}
		}
		// other data types
		else{
			if( data !== undefined ){
				if( data && typeof data === 'string' ){
					this.write(data);
				}
				this.close();
			}
		}
	},

	pipeTo(stream){
		if( this.state === 'cancelled' ){
			throw new Error('stream cancelled : it cannot pipeTo other streams');
		}

		if( isNodeStream(stream) ){
			stream.close = stream.end;

			var promise = new Promise(function(res, rej){
				stream.on('end', res);
				stream.on('error', rej);
			});

			stream.then = function(onResolve, onReject){
				return promise.then(onResolve, onReject);
			};

			stream.catch = function(onReject){
				return promise.catch(onReject);
			};

			stream.error = function(e){
				stream.emit('error', e);
			};
		}

		if( this.state === 'errored' ){
			stream.error(this.storedError);
		}
		else{
			this.pipes.push(stream);
			if( this.length ){
				this.buffers.forEach(function(buffer){
					stream.write(buffer);
				}, this);
			}
			if( this.state === 'closed' ){
				stream.close();
			}
		}

		return stream;
	},

	write(data){
		this.buffers.push(data);
		this.length+= data.length;

		this.pipes.forEach(function(pipe){
			pipe.write(data);
		});
	},

	error(e){
		this.state = 'errored';
		this.storedError = e;
		this.pipes.forEach(function(pipe){
			pipe.error(e);
		});
		this.reject(e);
	},

	close(){
		this.pipes.forEach(function(pipe){
			pipe.close();
		});
		this.pipes.length = 0;
		this.state = 'closed';
		this.resolve();
	},

	cancel(){
		this.close();
		this.buffers.length = 0;
		this.length = 0;
		this.state = 'cancelled';
	},

	tee(){
		var a = this;
		var b = new this.constructor();

		this.pipeTo(b);

		return [
			a,
			b
		];
	},

	then(a, b){
		return this.promise.then(a, b);
	},

	catch(a){
		return this.then(null, a);
	},

	readAsString(){
		return this.then(function(){
			return this.buffers.join('');
		}.bind(this));
	}
});

export default DuplexStream;