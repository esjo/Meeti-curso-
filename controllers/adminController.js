const Grupos = require('../models/Grupos');
const Meeti = require('../models/Meeti');
const moment = require('moment');
const Sequelize = require('sequelize');
op = Sequelize.Op;

exports.panelAdministracion = async(req,res) => {


    console.log();

    //consultas
    const consultas = [];

    consultas.push(Grupos.findAll({where:{usuarioId: req.user.id}}));
    consultas.push(Meeti.findAll({where:{usuarioId: req.user.id, 
                                        fecha:{[op.gte]:moment(new Date()).format("YYYY-MM-DD")}
                                        },
                                order : [
                                    ['fecha','ASC']
                                ]

    }));

    consultas.push(Meeti.findAll({where:{usuarioId: req.user.id, 
                                        fecha:{[op.lt]:moment(new Date()).format("YYYY-MM-DD")}
    }}));



    //array destructuring
    const [grupos, meeti,anteriores] = await Promise.all(consultas);

    console.log(req);
    res.render('administracion',{
        nombrePagina: 'Panel de administración',
        grupos,
        meeti,
        anteriores,
        moment
    })
}