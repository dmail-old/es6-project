export function parse(args, index){
	index = typeof index == 'number' ? index : 2;
	args = args.slice(index);

	var i = 0, j = args.length, arg, equalIndex, key, value, object = {};

	for(;i<j;i++){
		arg = args[i];
		equalIndex = arg.indexOf('=');
		if( equalIndex === -1 ){
			if( arg[0] === '-' && arg[1] === '-' ){
				key = arg.slice(2);
				value = true;
			}
			else{
				key = i;
				value = arg;
			}
		}
		else{
			key = arg.slice(0, equalIndex);
			if( key[0] === '-' && key[1] === '-' ) key = key.slice(2);
			value = arg.slice(equalIndex + 1);
		}

		if( value === 'true' ) value = true;
		else if( value === 'false' ) value = false;
		object[key] = value;
	}

	return object;
}

export function prepare(args){
	var prepared = [], key, value;

	if( args instanceof Array ){
		prepared = args;
	}
	else{
		prepared = [];
		for(key in args){
			value = args[key];
			if( typeof key === 'number' || !isNaN(key) ){
				prepared[Number(key)] = value;
			}
			else{
				prepared.push(key + '=' + value);
			}
		}
	}

	return prepared;
}