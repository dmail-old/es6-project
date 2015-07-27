export let HttpBody = {
	bodyUsed: false,

	text(){
		return (this.body ? this.body.readAsString() : Promise.resolve('')).then(function(text){
			this.bodyUsed = true;
			return text;
		}.bind(this));
	},

	json(){
		return this.text().then(JSON.parse);
	}
};

export default HttpBody;