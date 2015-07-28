import proto from '../proto/index.js';

export function createResult(value, done){
	var result = {};

	result.value = value;
	result.done = done;

	return result;
}

export function generate(value){
	return createResult(value, false);
}

export function done(){
	return createResult(undefined, true);
}

export class ObjectIterator {
	constructor(object, kind){
		this.object = object;
		this.kind = kind || 'key+value';
		this.nextIndex = 0;
		this.keys = Object.keys(object);
	}

	next(){
		var index = this.nextIndex, keys = this.keys, length = keys.length, kind, key, object;

		if( index >= length ){
			return done();
		}

		this.nextIndex++;
		kind = this.kind;
		key = keys[index];

		if( kind == 'key' ){
			return generate(key);
		}

		object = this.object;
		if( kind == 'value' ){
			return generate(object[key]);
		}

		return generate([key, object[key]]);
	}

	toString(){
		return '[object ObjectIterator]';
	}
}

export class PropertyIterator extends ObjectIterator {
	constructor(object, property, kind){
		return super(object[property], kind);
	}
}

export default ObjectIterator;