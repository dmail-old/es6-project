/*
npm test will test special stuff here
but I'll need a special npm module like 'jsenv-test'
and each time I create a module on git I add in the package.json

devDependencies: {"jsenv-test": '*'},
scripts:{ test: node jsenv-test}

jsenv-test will be responsible to test the module by reading any test folder & runnin all tests found in it
in a jsenv process

*/