import filesystem from './filesystem.js';

function hasDirectory(dir){
	return filesystem('stat', dir).then(function(stat){
		return stat.isDirectory();
	}).catch(function(error){
		if( error && error.code == 'ENOENT' ) return false;
		return Promise.reject(error);
	});
}

export default hasDirectory;