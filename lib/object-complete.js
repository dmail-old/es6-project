import forEachArgumentProperties from './foreach-arguments-properties.js';

Object.complete = function(){
	return forEachArgumentProperties(arguments, function(object, key, owner){
		if( key in object ){
			var current = object[key], value = owner[key];
			if( typeof current === 'object' && typeof value === 'object' ){
				Object.complete(current, value);
			}
			return;
		}

		object[key] = owner[key];
	});
};