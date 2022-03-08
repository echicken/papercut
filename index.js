'use strict';
const fs = require('fs');
const xmlrpc = require('xmlrpc');

const api_spec = JSON.parse(fs.readFileSync(__dirname + '/papercut_api.json', 'utf8'));

/**
 * An interface to the PaperCut XML web services API
 *
 * The server/examples/webservices/java/docs/api/ServerCommandProxy.html file
 * should be copied here and updated when PaperCut is upgraded.
 *
 * 'npm run scrape' makes papercut_api.json, docs.js from ServerCommandProxy.html
 *
 * 'npm run docs' generates README.md based on index.js and docs.js
 * (requires jsdoc2md to be installed globally (I should fix that))
 *
 * All methods of the PaperCut XML web services API are implemented dynamically
 * based on ServerCommandProxy.html via papercut_api.json.  Minimal parameter
 * validation is provided on these methods.
 * 
 * In the case of overloaded methods (eg. adjustUserAccountBalance), only the
 * first method is implemented.
 */
class PaperCut {

	/**
	 * Create an instance
	 * @param {string} host - The PaperCut server's FQDN
	 * @param {number} port - Connect to this port number
	 * @param {string} token - Your API token
	 * @param {string} path - The path to the XML web service
	 * @param {boolean} tls - Use SSL/TLS
	 */
	constructor (host, port, token, path = '/rpc/api/xmlrpc', tls = true) {

		const o = { host, port, path };
		const client = tls ? xmlrpc.createSecureClient(o) : xmlrpc.createClient(o);

		/**
		 * Call an arbitrary method on the API
		 * @return {Promise} Resolves with API response or rejects with error
		 * @param {string} method - Method name, eg. 'getUserAccountBalance'
		 * @param {...(string|number|boolean)} param - Parameter(s) for the method call
		 */
		this.call_api = function (method, ...params) {
			return new Promise((resolve, reject) => {
				client.methodCall(`api.${method}`, [token].concat(...params), (e, v) => {
					e ? reject(e) : resolve(v);
				});
			});
		}

	}

}

api_spec.forEach(method => {

	if (PaperCut.prototype[method.name] !== undefined) return;

	PaperCut.prototype[method.name] = function (...params) {
    	method.parameters.forEach((e, i) => {
			if (params[i] === undefined) throw `Parameter ${e.name} ${e.type} missing`;
			switch (e.type) {
				case 'array':
					if (!Array.isArray(params[i])) throw `${e.name} is not an array`;
					break;
				case 'double':
					params[i] = parseFloat(params[i]);
					if (isNaN(params[i])) throw `${e.name} is not a float`;
					params[i] = parseFloat(params[i].toFixed(2));
					break;
				case 'int':
					params[i] = parseInt(params[i], 10);
					if (isNaN(params[i])) throw `${e.name} is not an integer`;
					break;
				default:
					if (typeof params[i] != e.type) throw `${e.name} must be ${e.type}`;
					break;
			}
	    });
    	return this.call_api(method.name, params);
	}

});

module.exports = PaperCut;
