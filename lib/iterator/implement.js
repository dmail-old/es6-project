import ObjectIterator from './object-iterator.js';

export function defineProperty(object, name, value, safe = false){
	if( false === safe || false === object.hasOwnProperty(name) ){
		Object.defineProperty(object, name, {
			enumerable: false,
			writable: true,
			value: value
		});
	}
}

export var methods = [
	{method: 'keys', kind: 'key'},
	{method: 'values', kind: 'value'},
	{method: 'entries', kind: 'key+value'}
];

export function getMethodOfIteration(kind = 'key+value'){
	var found;

	found = methods.find(function(method){
		return method.kind == kind;
	});

	return found ? found.method : null;
}

export function implement(object, IteratorConstructor, addMethods = false, safe = false){
	if( typeof IteratorConstructor == 'string' ){
		var property = IteratorConstructor;
		IteratorConstructor = function(item, kind){
			var object = item[property], method = getMethodOfIteration(kind);

			if( method in object && typeof object[method] === 'function' ){
				return object[method]();
			}

			return ObjectIterator.create(object, kind);
		};

		addMethods = true;
		safe = false;
	}

	defineProperty(object, Symbol.iterator, function(){
		return new IteratorConstructor(this, 'key+value');
	}, safe);

	if( addMethods ){
		methods.forEach(function(iteration){
			defineProperty(object, iteration.method, function(){
				return new IteratorConstructor(this, iteration.kind);
			}, safe);
		});
	}
}

export default implement;