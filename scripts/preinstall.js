// npm link the dependencies

var path = require('path');
var fs = require('fs');
var cwd = process.cwd();
var nodeModulesFolderLocation = path.resolve(cwd, './node_modules');
var packageLocation = path.resolve(cwd, './package.json');
var dependencies = JSON.parse(fs.readFileSync(packageLocation)).dependencies;

// https://github.com/domenic/path-is-inside/blob/master/lib/path-is-inside.js
function pathIsInside(thePath, potentialParent){
// For inside-directory checking, we want to allow trailing slashes, so normalize.
    thePath = stripTrailingSep(thePath);
    potentialParent = stripTrailingSep(potentialParent);

    // Node treats only Windows as case-insensitive in its path module; we follow those conventions.
    if (process.platform === "win32") {
        thePath = thePath.toLowerCase();
        potentialParent = potentialParent.toLowerCase();
    }

    return thePath.lastIndexOf(potentialParent, 0) === 0 &&
		(
			thePath[potentialParent.length] === path.sep ||
			thePath[potentialParent.length] === undefined
		);
}

function stripTrailingSep(thePath) {
    if (thePath[thePath.length - 1] === path.sep) {
        return thePath.slice(0, -1);
    }
    return thePath;
}

dependencies = Object.keys(dependencies).map(function(dependencyName){
	return {
		name: dependencyName,
		value: dependencies[dependencyName]
	};
});

// if dependency.value.indexOf('git') === 0 child_process.execSync('git clone', {cwd: process.env.NPM_GIT_CLONE_FOLDER})

dependencies.forEach(function(dependency){
	try{
		dependency.foldername = path.dirname(require.resolve(dependency.name));
	}
	catch(e){

	}
});

dependencies = dependencies.filter(function(dependency){
	return dependency.foldername;
});

dependencies.forEach(function(dependency){
	var foldername = dependency.foldername;
	var projectFoldername = path.join(nodeModulesFolderLocation, dependency.name);

	console.log(dependency.name, 'location', projectFoldername);

	if( foldername != projectFoldername && !pathIsInside(foldername, projectFoldername) ){
		var relative = path.relative(cwd, foldername);

		var cmds = [
			'npm link ' + relative
		];

		cmds.forEach(function(cmd){
			console.log(cmd);
			require('child_process').execSync(cmd);
		});
	}
});