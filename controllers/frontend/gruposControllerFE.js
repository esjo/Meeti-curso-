const Grupos = require('../../models/Grupos');
const Meeti = require('../../models/Meeti');
const moment = require('moment');

exports.mostrarGrupo = async(req,res) =>{
    const consultas = [];

    consultas.push(Grupos.findOne({
        where:{
            id: req.params.id
        }
    }))

    consultas.push(Meeti.findAll({
        where:{
            grupoId: req.params.id,
        },
        order:[
            ['fecha','ASC']
        ]
    }))

    const [grupo,meeti] = await Promise.all(consultas);

    //Si no hay grupo
    if(!grupo){
        res.redirect('/');
        return next();
    }

    //Mostrar la vista
    res.render('mostrar-grupo',{
        nombrePagina: `Información grupo: ${grupo.nombre}`,
        meeti,
        grupo,
        moment,
        
    })
}