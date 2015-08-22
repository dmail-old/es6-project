import proto from './modules/proto/index.js';

var http = require('http');
var https = require('https');
var url = require('url');

export var Server = proto.extend({
	constructor: function(location){
		var port, hostname, protocol, isSecure;

		location = url.parse(location);

		protocol = location.protocol || 'http:';
		protocol = protocol.slice(0, protocol.indexOf(':'));
		isSecure = protocol === 'https';
		hostname = location.hostname;
		port = location.port || (isSecure ? 443 : 80);

		var server = (isSecure ? https : http).createServer();

		server.open = function(){
			server.listen(port, hostname, function(){
				server.emit('open');
			});
		};

		return server;
	}
});

export default Server;