const Meeti = require('../../models/Meeti');
const Grupos = require('../../models/Grupos');
const usuarios = require('../../models/usuarios');
const moment = require('moment');
const Sequelize = require('sequelize');
const Categorias = require('../../models/Categorias');
const Comentarios = require('../../models/Comentarios');
const Op = Sequelize.Op;

exports.mostrarMeeti = async(req,res,next) =>{
    const meeti = await Meeti.findOne(
        {where:{
            slug: req.params.slug
        },
        include : [
            {
                model: Grupos
            },
            {
                model:usuarios,
                attributes : ['id', 'nombre', 'imagen']
            }
        ]
    }
    );

    //Si no existe
    if(!meeti){
        res.redirect('/');
    }

    //Consultar por meetis cercanos 
    const ubicacion = Sequelize.literal(`ST_GeomFromText( 'POINT( 
        ${meeti.ubicacion.coordinates[0]} ${meeti.ubicacion.coordinates[1]} )' )`);

    //ST_DISTANCE_Sphere = retorna una linea y metros
    const distancia = Sequelize.fn('ST_DistanceSphere', 
    Sequelize.col('ubicacion'), ubicacion);

    //Encontrar meetis cercanos
    const cercanos = await Meeti.findAll({
        offset: 1,
        order: distancia, //Los ordena del mas cercano al mas lejano
        where: Sequelize.where(distancia, { [Op.lte] : 2000 }), //2km o 2000 metros
        limit: 3, //maximo 3
        
        include : [
            {
                model: Grupos
            },
            {
                model:usuarios,
                attributes : ['id', 'nombre', 'imagen']
            }
        ]
    })

    //Consultar despues de verificar que exista el meeti
    const comentarios = await Comentarios.findAll({
        where:{meetiId: meeti.id},
        include:[
           { 
            model: usuarios,
            attributes : ['id', 'nombre', 'imagen']
        }
        ]
    })

    //Pasar el resultado a la vista
    res.render('mostrar-meeti',{
        nombrePagina: meeti.titulo,
        meeti,
        moment,
        cercanos,
        comentarios
    })
}


//Confirma si el usuario asistira a el meeti
exports.confirmarAsistencia = async(req,res) =>{

    console.log(req.body)

    const {accion} = req.body;

    if(accion === 'confirmar'){
        //agregar el usuario
        Meeti.update(
            {'interesados': Sequelize.fn('array_append',Sequelize.col('interesados'),req.user.id)},
            {where:{'slug':req.params.slug}}
        );
        res.send('Has confirmado tu asistencia');
    }else{
        //cancelar la asistencia del usuario
        Meeti.update(
            {'interesados': Sequelize.fn('array_remove',Sequelize.col('interesados'),req.user.id)},
            {where:{'slug':req.params.slug}}
        );
        res.send('Has cancelado tu asistencia');
    }
}


exports.mostrarAsistentes = async(req,res) =>{
    const meeti = await Meeti.findOne({
        where:{slug:req.params.slug},
        attributes:['interesados']
    })

    const {interesados} = meeti;

    const asistentes = await usuarios.findAll({
        attributes:['nombre','imagen'],
        where:{id:interesados}
    })

    //Crear la vista y pasar datos 
    res.render('asistentes-meeti',{
        nombrePagina: 'Listados asistentes Meeti',
        asistentes
    })
}


//Mustra los meetis agrupados por categoria
exports.mostrarCategoria = async(req,res,next) =>{
    const categoria = await Categorias.findOne(
    {
        attributes:['id','nombre'],where:{slug: req.params.categoria}
    });

    const Meetis = await Meeti.findAll({
        order:[
            ['fecha','ASC'],
            ['hora','ASC']
        ],
        include:[
            {
                model:Grupos,
                where:{categoriaId: categoria.id}
            },
            {
                model:usuarios,

            }
        ]
    });

    res.render('categoria',{
        nombrePagina:`Categoria: ${categoria.nombre}`,
        Meetis,
        moment
    });
}
