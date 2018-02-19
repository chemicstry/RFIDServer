const EventInterface = require('./EventInterface.js');
const TagFactory = require('./TagFactory.js');
const Log = require('./Log.js');

class AuthService
{
    constructor(eventInterface)
    {
        this.eventInterface = eventInterface;
    }

    async TagTransceive(buf)
    {
    }

    OnTagTransceive(args)
    {
    }

    async OnNewTarget(args)
    {

    }
}

module.exports = AuthService;
