import { ModeloSistema }     from './models/ModeloSistema.js';
import { ControladorAcceso }  from './controllers/ControladorAcceso.js';
import { VistaAcceso }        from './views/VistaAcceso.js';

const modelo      = new ModeloSistema();
const controlador = new ControladorAcceso(modelo);
const vista       = new VistaAcceso();

vista.init(controlador);

modelo.suscribir(() => vista.renderizarTodo());

vista.renderizarTodo();
