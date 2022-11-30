const usuarios = require('../../models/usuarios');
const grupos = require('../../models/Grupos');
const Grupos = require('../../models/Grupos');

exports.mostrarUsuario = async(req,res,next) => {
    const consulta = [];

    //consulta al mismo tiempo
    consulta.push(usuarios.findOne({where:{id: req.params.id}}));
    consulta.push(Grupos.findAll({where:{ usuarioId:req.params.id}}));

    const [usuario,grupos] = await Promise.all(consulta);

    if(!usuario){
        res.redirect('/');
        return next();
    }

    //mostrar la vista
    res.render('mostrar-pefil',{
        nombrePagina: `Perfil usuario: ${usuario.nombre}`,
        usuario,
        grupos
    })
}