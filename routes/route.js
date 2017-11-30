/*
* @Author: Ali
* @Date:   2017-02-25 13:31:00
* @Last Modified by:   Ali
* @Last Modified time: 2017-03-17 01:01:55
*/
var md5 = require("md5")
module.exports = (app, express, bodyParser, MongoClient, config, swaggerSpec) => {
    'use strict'

    // connecting to MoogoLab servive.
    var db;
    
    if (!config.hasOwnProperty('mongodb') || !config.hasOwnProperty('admin') || !config.hasOwnProperty('pass')){
        console.log('Incomplete config, exiting now');
        return false
    }
    MongoClient.connect( config.mongodb, (err, database) => {
        if (err) return console.log(err);
        db = database;
        app.listen(app.get('port'), () => {
            console.log('Server is listening on port ' + app.get('port') + '. Press CTRL-C to terminate.');
        });
    });

    /**
     * @swagger
     * definition:
     *   Santa:
     *     properties:
     *       name:
     *         type: string
     *       spouse:
     *         type: string
     *       match:
     *         type: string
     *       password:
     *         type: string     
     */

    /**
     * @swagger
     * definition:
     *   admin:
     *     properties:
     *       email:
     *         type: string
     *       password:
     *         type: string
     */

    /**
     * @swagger
     * /lastsanta:
     *   get:
     *     tags:
     *       - Santa
     *     description: Returns name of last Santa who registered.
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: Object of last Santa
     *         schema:
     *           $ref: '#/definitions/Santa'
     */
    app.get('/lastsanta', (req, res) => {
        var cursor = db.collection('santas').find().limit(1).sort({$natural:-1}).toArray((err, results) => {
             if (err) return console.log(err);
             res.json(results);
        });
    });

    /**
     * @swagger
     * /countsanta:
     *   get:
     *     tags:
     *       - Santa
     *     description: Returns number of Santas in database
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: object with a number in it
     *         schema:
     *           $ref: '#/definitions/Santa'
     */
    app.get('/countsanta', (req, res) => {
        var cursor = db.collection('santas').find().toArray((err, results) => {
             if (err) return console.log(err);
             res.json(results.length);
        });
    });


    /**
     * @swagger
     * /register:
     *   post:
     *     tags:
     *       - Santa
     *     description: Register Sanata, if they have spouse, they are supposed to enter it. At the moment, I couldnt cover removing duplicated santa, and making object for spouse in the same time.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: santa
     *         description: Santa object
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/Santa'
     *     responses:
     *       200:
     *         description: Successfully created
     */
    app.post('/register', (req, res) => {
        if (req.body.name.length !== 0){
            // ideally check if the database is already created anf has something in it
            // ideally check for duplicated santa
            var santas = [];
            var newSanta = {};
            var ok = true;
            newSanta.name = req.body.name.toLowerCase().trim();
            newSanta.spouse = req.body.spouse.toLowerCase().trim();
            newSanta.match = '';

            db.collection('santas').find().toArray((err, results) => {
                        if (err) return console.log(err);
                        santas = results;
                        var santaLength = santas.length;
                        var j = santaLength - 1;
                        while ( j >= 0 ){
                            if ( newSanta.name === santas[j].name && newSanta.spouse === santas[j].name) {
                                // console.log('santa is not ok!');
                                ok = false;
                                break;
                            }else{
                                // console.log('santa is ok!');
                                ok = true;
                            }
                            j -= 1;
                        }
                        if (req.body.passwordAgain !== req.body.password){
                            res.status(400).send('Passwords do not match');
                        }
                        else if ( ok ) {
                            newSanta.password = md5(req.body.password)
                            db.collection('santas').save(newSanta, (err, result) => {
                                if (err) return console.log(err);
                                // if ( newSanta.spouse.length !== 0 ) {
                                //     var temp = newSanta.name;
                                //     newSanta.name = newSanta.spouse;
                                //     newSanta.spouse = temp;
                                //     db.collection('santas').save(newSanta, (err, result) => {
                                //         if (err) return console.log(err);
                                //     })
                                // }
                                res.redirect('/');
                            });
                        } else if( !ok ) {
                            res.status(400).send('This Santa was entered before.');
                        }
            });

        } else {
            res.redirect('/');
        }
    });


    /**
     * @swagger
     * /myMatch:
     *   post:
     *     tags:
     *       - Santa
     *     description: Gives each Santa his/her match to buys a gift
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: santa
     *         description: Santa object
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/Santa'
     *     responses:
     *       200:
     *         description: Successfully receieved
     */
    app.post('/myMatch', (req, res) => {
        if (req.body.hasOwnProperty('name') && req.body.password && req.body.name.length !== 0 ){
            db.collection('santas').find({ name: req.body.name.toLowerCase().trim()}).toArray((err, results) => {
                if (results.length !==0) {
                    // Correct name
                    if (md5(req.body.password) !== results[0].password){
                        res.status(400).send('Sorry, incorrect password');
                    }
                    else{
                        res.json(results[0]);
                    }
                } else {
                    // Wrong name
                    res.json(results);
                }
            });
        } else {
            res.redirect('/');
        }
    });

    /**
     * @swagger
     * /makeMatch:
     *   post:
     *     tags:
     *       - Santa
     *     description: Prodives match for each Santa if correct username and password is provided by admin. Shuffling technic is used.
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: admin
     *         description: admin is in body. It has emailand password with it.
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/admin'
     *     responses:
     *       200:
     *         description: Successfully receieved
     */
    app.post('/makeMatch', (req, res) => {
        if (req.body.email.length !== 0 && req.body.pass.length !== 0){
            if (req.body.email === config.admin && req.body.pass === config.pass){
                 // I am using shuffiling method.
                    var santas = [];
                    var matches = [];
                    var ok = false;
                    db.collection('santas').find().toArray((err, results) => {
                        if (err) return console.log(err);
                        santas = results;

                        db.collection('santas').find().toArray((error, outputs) => {
                            if (error) return console.log(error);
                            matches = outputs;

                            //shuffle until a good match
                            var santaLength = santas.length;
                            while(!ok) {
                                shuffle(matches);
                                var i = santaLength -1;
                                while( i >= 0 ){
                                    if(santas[i].name === matches[i].name || santas[i].spouse === matches[i].name ){
                                         ok = false;
                                         break;
                                    }else{
                                        ok = true;
                                    }
                                    i -= 1;
                                }
                            }
                            // Once we are in a good shuffle, assign matches and save them
                            if(ok) {
                                var j = santaLength -1;
                                while( j >= 0 ){
                                    db.collection('santas').findOneAndUpdate(
                                        {name: santas[j].name}, {$set: {match: matches[j].name}}, {new: true}, (err, doc) => {
                                                                if(err){ console.log("Something wrong when updating data!");}
                                                                j -= 1;
                                                            }
                                    );
                                    santas[j].match = matches[j].name;
                                    j -= 1;
                                }
                            }
                        });
                    });
                res.send('We should have a match, now!');
            } else {
                res.status(400).send('Wrong username and password for the admin');
            }
        }

    });


    /**
     * @swagger
     * /deletefamily:
     *   post:
     *     tags:
     *       - Santa
     *     description: Deletes full Santa collection if correct username and password is provided by admin
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: admin
     *         description: admin is in body. It has email and password with it.
     *         in: body
     *         required: true
     *         schema:
     *           $ref: '#/definitions/admin'
     *     responses:
     *       200:
     *         description: Successfully receieved
     */
    app.post('/deletefamily', (req, res)  => {
         if (req.body.email.length !== 0 && req.body.pass.length !== 0){
            if (req.body.email === config.admin && req.body.pass === config.pass){
                db.collection('santas').drop((err, doc) => {
                    res.send(doc);
                });
            } else {
                res.status(400).send('Wrong username and password for the admin');
            }
         }
      });

    // serve swagger
    app.get('/swagger.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    /**
     * Shuffles array in place. Fisher-Yates Shuffle 
     * @param {Array} a items The array containing the items.
     * @source http://jsfromhell.com/array/shuffle
     */
    function shuffle(array) {
        let counter = array.length;

        // While there are elements in the array
        while (counter > 0) {
            // Pick a random index
            let index = Math.floor(Math.random() * counter);

            // Decrease counter by 1
            counter--;

            // And swap the last element with it
            let temp = array[counter];
            array[counter] = array[index];
            array[index] = temp;
        }

        return array;
    }
}