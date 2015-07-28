import proto from '../proto/index.js';

export var URLSelector = proto.extend({
	constructor: function(parts){
		Object.assign(this, parts);
	},

	toString: function(){
		return '[Url Selector]';
	},

	toNumber: function(){
		var score = 0;

		if( this.protocol ){
			score+= 1;
		}
		if( this.hostname ){
			score+= 2;
		}
		if( this.port ){
			score+= 4;
		}
		if( this.pathname ){
			score+= 8;
		}
		if( this.dirname ){
			score+= 16;
		}
		if( this.extname ){
			score+= 32;
		}

		return score;
	},

	match: function(url){
		if( this.protocol ){
			if( this.protocol != url.protocol.slice(0, -1) ){
				return false;
			}
		}
		if( this.hostname ){
			if( this.hostname != url.hostname ){
				return false;
			}
		}

		return true;
	}
});

export default URLSelector;