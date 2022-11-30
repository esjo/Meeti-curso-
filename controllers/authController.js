const passport = require('passport');

exports.autentificarUsuario = passport.authenticate('local',{
    successRedirect : '/adminstracion',
    failureRedirect: '/iniciar-sesion',
    failureFlash: true,
    badRequestMessage: 'Ambos campos son obligatorios'
});


//Revisar si el usuario esta autenticado
exports.usuarioAutenticado = (req,res,next) =>{
    //Si el usuario esta autenticado, adelante
    if(req.isAuthenticated()){
        return next();
    }

    //Sino esta autenticado
    return res.redirect('/iniciar-sesion');
}

exports.cerrarSesion = (req, res, next) =>{
    req.logout(async (err) => {
        if (err) { return next(err); }
        await req.flash('exito','Cerraste sesión correctamente');
        res.redirect('/iniciar-sesion');
        
        next();

      });
      
}