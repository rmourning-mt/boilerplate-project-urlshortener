var dns = require('dns');
var mongoose = require('mongoose');
var shortid = require('shortid');

/**
 * If positive, enables checking that shortId is unique before
 * attempting to save.
 * If there is a conflict, the value indicates
 * the number of additional times an id should be generated and
 * checked for uniqueness before failing.
*/
var retryCount = parseInt(process.env.SHORTID_RETRY_COUNT) || 0;
/**
 * If true, hostnames will need to pass a DNS lookup before
 * a short url will be created.
*/
var requireDnsCheck = process.env.DNS_CHECK === "true";

var ShortUrl = mongoose.model('ShortUrl', {
    shortId: { type: String, required: true, unique: true },
    originalUrl: { type: String, required: true, unique: false }
});

function create(originalUrl, done) {
    validateUrl(originalUrl, (err, urlObj) => {
        if (err) {
            done("Invalid url.");
        } else {
            getShortId((err, shortId) => {
                if (err) {
                    done("Error generating shortened url ID, please try again.");
                } else {
                    new ShortUrl({
                        shortId: shortId,
                        originalUrl: originalUrl
                    }).save((err, data) => {
                        if (err) {
                            done("Unexpected system failure, please try again later.");
                        } else {
                            done(null, data.shortId);
                        }
                    });
                }
            });
        }
    });
}

function get(shortId, done) {
    ShortUrl.findOne({ shortId: shortId }).select("originalUrl").exec((err, shortUrl) => {
        if (err) {
            done("Unexpected failure retrieving original url.");
        } else if (!shortUrl) {
            done(null, null);
        } else {
            done(null, shortUrl.originalUrl);
        }
    });
}

function getShortId(done) {
    if (retryCount > 0) {
        ensureUniqueShortId(retryCount, done);
    } else {
        done(null, shortid.generate());
    }
}

function ensureUniqueShortId(retriesLeft, done) {
    var shortId = shortid.generate();
    ShortUrl.countDocuments({ shortId: shortId }, (err, count) => {
        if (err) {
            done(err);
        } else if (count) {
            if (retriesLeft > 0) {
                ensureUniqueShortId(--retriesLeft, done);
            } else {
                done("Exceeded maximum retry count.");
            }
        } else {
            done(null, shortId);
        }
    });
}

function validateUrl(value, done) {
    try {
        var urlObj = new URL(value);
        if (requireDnsCheck) {
            dns.lookup(urlObj.hostname, (err) => {
                if (err) {
                    done(err);
                } else {
                    done(null, urlObj);
                }
            });
        } else {
            done(null, urlObj);
        }
    } catch (ex) {
        done(ex);
    }
}

module.exports = {
    create,
    get
};
