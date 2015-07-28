// https://streams.spec.whatwg.org/
// https://streams.spec.whatwg.org/#rs-model
// http://jakearchibald.com/2015/thats-so-fetch/
import proto from '../proto/index.js';

export let DuplexStream = proto.extend({
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
			if( typeof data._read === 'function' && typeof data._readableState === 'object' ){
				var Stream = require('stream').PassThrough;
				var stream = new Stream();

				stream.on('error', this.error.bind(this));
				stream.on('data', this.write.bind(this));
				stream.on('end', this.close.bind(this));

				data.pipe(stream);
			}
			else if( data instanceof this.constructor ){
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

		// node streams
		if( !stream.close ) stream.close = stream.end;

		this.pipes.push(stream);
		if( this.length ){
			this.buffers.forEach(function(buffer){
				stream.write(buffer);
			}, this);
		}
		if( this.state === 'closed' ){
			stream.close();
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
		return [
			this,
			this.pipeTo(new this.constructor())
		];
	},

	then(a, b){
		return this.promise.then(a, b);
	},

	readAsString(){
		return this.then(function(){
			return this.buffers.join('');
		}.bind(this));
	}
});

export default DuplexStream;