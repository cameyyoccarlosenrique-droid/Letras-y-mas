document.addEventListener("DOMContentLoaded", () => {
  const contenedor = document.getElementById("contenedor-productos");
  const buscador = document.getElementById("buscador");
  const contador = document.getElementById("contador-productos");

  const botonResumen = document.getElementById("boton-resumen");
  const panelResumen = document.getElementById("panel-resumen");
  const cerrarResumen = document.getElementById("cerrar-resumen");
  const listaResumen = document.getElementById("lista-resumen");
  const totalResumen = document.getElementById("total-resumen");
  const listaVentas = document.getElementById("lista-ventas");
  const descripcionVentas = document.getElementById("descripcion-ventas");
  const botonReiniciarVenta = document.getElementById("boton-reiniciar-venta");

  const panelFormulario = document.getElementById("panel-nuevo-producto");
  const formProducto = document.getElementById("form-nuevo-producto");
  const abrirFormulario = document.getElementById("abrir-formulario-producto");
  const abrirFormularioTarjeta =
    document.getElementById("abrir-formulario-producto-tarjeta");
  const cerrarFormulario = document.getElementById("cerrar-formulario-producto");
  const cancelarFormulario = document.getElementById("cancelar-nuevo-producto");

  const campoNombre = document.getElementById("nuevo-nombre");
  const campoDescripcion = document.getElementById("nuevo-descripcion");
  const campoPrecio = document.getElementById("nuevo-precio");
  const campoStock = document.getElementById("nuevo-stock");
  const campoFoto = document.getElementById("nuevo-foto");
  const vistaPrevia = document.getElementById("vista-previa-producto");

  const CLAVES = {
    inventario: "letraMasInventario",
    ediciones: "letraMasEdiciones",
    eliminados: "letraMasEliminados",
    nuevos: "letraMasProductosNuevos",
    ventas: "letraMasVentas"
  };

  function leer(clave, valorInicial) {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado === null ? valorInicial : JSON.parse(guardado);
    } catch (error) {
      console.error("No se pudieron leer los datos guardados:", error);
      return valorInicial;
    }
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (error) {
      console.error("No se pudieron guardar los datos:", error);
      alert("No se pudieron guardar los cambios. Comprueba el almacenamiento disponible.");
      return false;
    }
  }

  let inventario = leer(CLAVES.inventario, {});
  let ediciones = leer(CLAVES.ediciones, {});
  let eliminados = leer(CLAVES.eliminados, []);
  let productosNuevos = leer(CLAVES.nuevos, []);
  let ventas = leer(CLAVES.ventas, []);

  if (!inventario || typeof inventario !== "object" || Array.isArray(inventario)) {
    inventario = {};
  }

  if (!ediciones || typeof ediciones !== "object" || Array.isArray(ediciones)) {
    ediciones = {};
  }

  if (!Array.isArray(eliminados)) eliminados = [];
  if (!Array.isArray(productosNuevos)) productosNuevos = [];
  if (!Array.isArray(ventas)) ventas = [];

  function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) elemento.className = clase;
    if (texto !== undefined) elemento.textContent = texto;

    return elemento;
  }

  function formatoPrecio(valor) {
    return "Q " + Number(valor || 0).toLocaleString("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Reconoce precios como Q 2,999 y Q 3,900.00.
  // Si hay dos precios, toma el primero.
  function precioNumerico(texto) {
    const coincidencia = String(texto)
      .replace(/\u00a0/g, " ")
      .match(/\d[\d,]*(?:\.\d+)?/);

    if (!coincidencia) return 0;

    return Number(coincidencia[0].replace(/,/g, "")) || 0;
  }

  function buscarProductoNuevo(id) {
    return productosNuevos.find(producto => producto.id === id) || null;
  }

  function obtenerStock(tarjeta, id) {
    if (Object.prototype.hasOwnProperty.call(inventario, id)) {
      return Math.max(0, Number(inventario[id]) || 0);
    }

    const producto = buscarProductoNuevo(id);

    if (producto) {
      return Math.max(0, Number(producto.stock) || 0);
    }

    return Math.max(0, Number(tarjeta.dataset.stock) || 0);
  }

  function guardarStock(id, cantidad) {
    const cantidadAnterior = inventario[id];
    inventario[id] = Math.max(0, Number(cantidad) || 0);

    if (!guardar(CLAVES.inventario, inventario)) {
      if (cantidadAnterior === undefined) {
        delete inventario[id];
      } else {
        inventario[id] = cantidadAnterior;
      }
      return false;
    }

    const producto = buscarProductoNuevo(id);

    if (producto) {
      const stockAnterior = producto.stock;
      producto.stock = inventario[id];

      if (!guardar(CLAVES.nuevos, productosNuevos)) {
        producto.stock = stockAnterior;
        inventario[id] = cantidadAnterior ?? stockAnterior;
        guardar(CLAVES.inventario, inventario);
        return false;
      }
    }

    return true;
  }

  function aplicarEdicionGuardada(tarjeta, id) {
    const cambios = ediciones[id];

    if (!cambios) return;

    const titulo = tarjeta.querySelector("h3");
    const descripcion = tarjeta.querySelector(".contenido-tarjeta p:not(.precio)");
    const precio = tarjeta.querySelector(".precio");
    const imagen = tarjeta.querySelector(".imagen-producto");

    if (titulo && cambios.nombre !== undefined) {
      titulo.textContent = cambios.nombre;
    }

    if (descripcion && cambios.descripcion !== undefined) {
      descripcion.textContent = cambios.descripcion;
    }

    if (precio) {
      precio.textContent = cambios.precioTexto || formatoPrecio(cambios.precio);
    }

    if (imagen && cambios.foto) {
      imagen.src = cambios.foto;
    }
  }

  function registrarVenta(id, nombre, cantidad, precioUnitario) {
    const venta = {
      id: "venta-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      productoId: id,
      nombre,
      cantidad,
      precioUnitario,
      total: cantidad * precioUnitario,
      fecha: new Date().toLocaleString("es-GT")
    };

    ventas.push(venta);

    if (!guardar(CLAVES.ventas, ventas)) {
      ventas.pop();
      return false;
    }

    return true;
  }

  function actualizarTarjeta(tarjeta, id) {
    const stock = obtenerStock(tarjeta, id);
    tarjeta.dataset.stock = String(stock);

    let etiquetaStock = tarjeta.querySelector(".info-stock");

    if (!etiquetaStock) {
      etiquetaStock = crearElemento("p", "info-stock");
      tarjeta.appendChild(etiquetaStock);
    }

    etiquetaStock.textContent = stock > 0
      ? `Disponibles: ${stock}`
      : "Agotado";

    etiquetaStock.className = "info-stock " +
      (stock > 0 ? "stock-disponible" : "stock-agotado");

    let controles = tarjeta.querySelector(".controles-compra");

    if (!controles) {
      controles = crearElemento("div", "controles-compra");

      const cantidad = document.createElement("input");
      cantidad.type = "number";
      cantidad.min = "1";
      cantidad.step = "1";
      cantidad.value = "1";
      cantidad.className = "cantidad-compra";
      cantidad.setAttribute("aria-label", "Cantidad a comprar");

      const comprar = crearElemento("button", "boton-comprar", "Comprar");
      comprar.type = "button";

      controles.append(cantidad, comprar);
      tarjeta.appendChild(controles);

      comprar.addEventListener("click", () => {
        const unidades = Number(cantidad.value);
        const disponibles = obtenerStock(tarjeta, id);

        if (!Number.isInteger(unidades) || unidades < 1) {
          alert("Escribe una cantidad válida.");
          return;
        }

        if (unidades > disponibles) {
          alert(`Solo hay ${disponibles} unidad(es) disponible(s).`);
          return;
        }

        const titulo = tarjeta.querySelector("h3");
        const precioElemento = tarjeta.querySelector(".precio");

        const nombre = titulo ? titulo.textContent : "Producto";
        const precio = precioNumerico(
          precioElemento ? precioElemento.textContent : "0"
        );

        if (precio <= 0) {
          alert("El producto no tiene un precio válido.");
          return;
        }

        const totalCompra = unidades * precio;

        // Descontar existencias antes de registrar la venta.
        if (!guardarStock(id, disponibles - unidades)) {
          alert("No se pudo guardar el cambio de inventario.");
          return;
        }

        if (!registrarVenta(id, nombre, unidades, precio)) {
          guardarStock(id, disponibles);
          actualizarTarjeta(tarjeta, id);
          alert("No se pudo registrar la venta. Se restauró el inventario.");
          return;
        }

        cantidad.value = "1";

        actualizarTarjeta(tarjeta, id);
        actualizarResumen();
        actualizarContador();

        alert(
          `¡Venta registrada correctamente!\n\n` +
          `Producto: ${nombre}\n` +
          `Unidades vendidas: ${unidades}\n` +
          `Total de la venta: ${formatoPrecio(totalCompra)}`
        );
      });
    }

    const cantidad = controles.querySelector("input");
    const comprar = controles.querySelector("button");

    cantidad.max = String(stock);

    if (stock === 0) {
      cantidad.value = "0";
    } else if (
      Number(cantidad.value) < 1 ||
      Number(cantidad.value) > stock
    ) {
      cantidad.value = "1";
    }

    cantidad.disabled = stock === 0;
    comprar.disabled = stock === 0;
    comprar.textContent = stock === 0 ? "Agotado" : "Comprar";

    let acciones = tarjeta.querySelector(".acciones-producto");

    if (!acciones) {
      acciones = crearElemento("div", "acciones-producto");

      const editar = crearElemento("button", "boton-editar", "Editar");
      editar.type = "button";

      const eliminar = crearElemento("button", "boton-eliminar", "Eliminar");
      eliminar.type = "button";

      acciones.append(editar, eliminar);
      tarjeta.appendChild(acciones);

      editar.addEventListener("click", () => {
        mostrarEdicion(tarjeta, id);
      });

      eliminar.addEventListener("click", () => {
        const titulo = tarjeta.querySelector("h3");
        const nombre = titulo ? titulo.textContent : "este producto";

        if (!confirm(`¿Seguro que deseas eliminar "${nombre}"?`)) {
          return;
        }

        if (id.startsWith("nuevo-")) {
          const nuevosAnteriores = [...productosNuevos];
          productosNuevos = productosNuevos.filter(p => p.id !== id);

          if (!guardar(CLAVES.nuevos, productosNuevos)) {
            productosNuevos = nuevosAnteriores;
            return;
          }
        } else {
          const eliminadosAnteriores = [...eliminados];

          if (!eliminados.includes(id)) {
            eliminados.push(id);

            if (!guardar(CLAVES.eliminados, eliminados)) {
              eliminados = eliminadosAnteriores;
              return;
            }
          }
        }

        const inventarioAnterior = { ...inventario };
        const edicionesAnteriores = { ...ediciones };

        delete inventario[id];
        delete ediciones[id];

        if (
          !guardar(CLAVES.inventario, inventario) ||
          !guardar(CLAVES.ediciones, ediciones)
        ) {
          inventario = inventarioAnterior;
          ediciones = edicionesAnteriores;
          guardar(CLAVES.inventario, inventario);
          guardar(CLAVES.ediciones, ediciones);
          alert("Comprueba el almacenamiento antes de continuar.");
          return;
        }

        tarjeta.remove();
        actualizarResumen();
        actualizarContador();
      });
    }
  }

  function leerFoto(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  function mostrarEdicion(tarjeta, id) {
    const existente = tarjeta.querySelector(".form-edicion");

    if (existente) {
      existente.remove();
      return;
    }

    const nombreActual = tarjeta.querySelector("h3").textContent;
    const descripcionActual =
      tarjeta.querySelector(".contenido-tarjeta p:not(.precio)").textContent;
    const precioActual = precioNumerico(
      tarjeta.querySelector(".precio").textContent
    );
    const stockActual = obtenerStock(tarjeta, id);

    const form = crearElemento("form", "form-edicion");

    const etiquetaNombre = crearElemento("label", "", "Nombre");
    const inputNombre = document.createElement("input");
    inputNombre.name = "nombre";
    inputNombre.required = true;
    inputNombre.maxLength = 100;
    etiquetaNombre.appendChild(inputNombre);

    const etiquetaDescripcion = crearElemento("label", "", "Descripción");
    const inputDescripcion = document.createElement("textarea");
    inputDescripcion.name = "descripcion";
    inputDescripcion.rows = 2;
    inputDescripcion.required = true;
    inputDescripcion.maxLength = 500;
    etiquetaDescripcion.appendChild(inputDescripcion);

    const etiquetaPrecio = crearElemento("label", "", "Precio en quetzales");
    const inputPrecio = document.createElement("input");
    inputPrecio.name = "precio";
    inputPrecio.type = "number";
    inputPrecio.min = "0.01";
    inputPrecio.step = "0.01";
    inputPrecio.required = true;
    etiquetaPrecio.appendChild(inputPrecio);

    const etiquetaStock = crearElemento("label", "", "Existencias");
    const inputStock = document.createElement("input");
    inputStock.name = "stock";
    inputStock.type = "number";
    inputStock.min = "0";
    inputStock.step = "1";
    inputStock.required = true;
    etiquetaStock.appendChild(inputStock);

    const etiquetaFoto = crearElemento("label", "", "Foto nueva (opcional)");
    const inputFoto = document.createElement("input");
    inputFoto.name = "foto";
    inputFoto.type = "file";
    inputFoto.accept = "image/*";
    etiquetaFoto.appendChild(inputFoto);

    const acciones = crearElemento("div", "acciones-formulario");

    const guardarCambios = crearElemento(
      "button", "boton-principal", "Guardar cambios"
    );
    guardarCambios.type = "submit";

    const cancelar = crearElemento(
      "button", "boton-secundario", "Cancelar"
    );
    cancelar.type = "button";

    acciones.append(guardarCambios, cancelar);

    form.append(
      etiquetaNombre,
      etiquetaDescripcion,
      etiquetaPrecio,
      etiquetaStock,
      etiquetaFoto,
      acciones
    );

    inputNombre.value = nombreActual;
    inputDescripcion.value = descripcionActual;
    inputPrecio.value = precioActual;
    inputStock.value = stockActual;

    cancelar.addEventListener("click", () => form.remove());

    form.addEventListener("submit", async evento => {
      evento.preventDefault();

      const nombre = inputNombre.value.trim();
      const descripcion = inputDescripcion.value.trim();
      const precio = Number(inputPrecio.value);
      const stock = Number(inputStock.value);
      const archivo = inputFoto.files[0];

      if (
        !nombre ||
        !descripcion ||
        !Number.isFinite(precio) ||
        precio <= 0 ||
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        alert("Revisa el nombre, descripción, precio y existencias.");
        return;
      }

      let foto = "";

      if (archivo) {
        if (!archivo.type.startsWith("image/")) {
          alert("Selecciona un archivo de imagen.");
          return;
        }

        if (archivo.size > 1024 * 1024) {
          alert("La fotografía debe pesar máximo 1 MB.");
          return;
        }

        try {
          foto = await leerFoto(archivo);
        } catch {
          alert("No se pudo cargar la fotografía.");
          return;
        }
      }

      const cambiosAnteriores = ediciones[id]
        ? { ...ediciones[id] }
        : null;

      const cambios = {
        nombre,
        descripcion,
        precio,
        precioTexto: formatoPrecio(precio)
      };

      if (foto) {
        cambios.foto = foto;
      } else if (cambiosAnteriores && cambiosAnteriores.foto) {
        cambios.foto = cambiosAnteriores.foto;
      }

      ediciones[id] = cambios;

      if (!guardar(CLAVES.ediciones, ediciones)) {
        if (cambiosAnteriores) ediciones[id] = cambiosAnteriores;
        else delete ediciones[id];
        return;
      }

      const productoNuevo = buscarProductoNuevo(id);
      const nuevosAnteriores = productoNuevo ? { ...productoNuevo } : null;

      if (productoNuevo) {
        productoNuevo.nombre = nombre;
        productoNuevo.descripcion = descripcion;
        productoNuevo.precio = precio;
        productoNuevo.stock = stock;

        if (foto) productoNuevo.foto = foto;

        if (!guardar(CLAVES.nuevos, productosNuevos)) {
          Object.assign(productoNuevo, nuevosAnteriores);
          ediciones[id] = cambiosAnteriores || {};
          guardar(CLAVES.ediciones, ediciones);
          return;
        }
      }

      if (!guardarStock(id, stock)) {
        alert("No se pudo guardar la cantidad nueva.");
        return;
      }

      aplicarEdicionGuardada(tarjeta, id);
      tarjeta.dataset.stock = String(stock);

      form.remove();
      actualizarTarjeta(tarjeta, id);
      actualizarResumen();
      actualizarContador();
      filtrarProductos();

      alert("Producto actualizado correctamente.");
    });

    tarjeta.appendChild(form);
    form.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function conectarTarjeta(tarjeta, id) {
    if (eliminados.includes(id)) {
      tarjeta.remove();
      return;
    }

    tarjeta.dataset.id = id;
    aplicarEdicionGuardada(tarjeta, id);
    actualizarTarjeta(tarjeta, id);
  }

  function crearTarjetaNuevo(producto) {
    // Evita duplicar productos al volver a cargar la página.
    if (contenedor.querySelector(`[data-id="${producto.id}"]`)) {
      return;
    }

    const tarjeta = document.createElement("article");
    tarjeta.className = "contenedor-tarjeta";
    tarjeta.dataset.id = producto.id;
    tarjeta.dataset.stock = String(producto.stock);

    const imagen = document.createElement("img");
    imagen.className = "imagen-producto";
    imagen.alt = producto.nombre;
    imagen.src = producto.foto || "img/telefono1.jpg";

    const contenido = crearElemento("div", "contenido-tarjeta");

    contenido.append(
      crearElemento("h3", "", producto.nombre),
      crearElemento("p", "", producto.descripcion),
      crearElemento("p", "precio", formatoPrecio(producto.precio))
    );

    tarjeta.append(imagen, contenido);

    const tarjetaAgregar =
      document.getElementById("tarjeta-agregar-producto");

    contenedor.insertBefore(tarjeta, tarjetaAgregar);
    conectarTarjeta(tarjeta, producto.id);
  }

  function actualizarResumen() {
  listaResumen.replaceChildren();
  listaVentas.replaceChildren();

  const tarjetas = [
    ...contenedor.querySelectorAll(".contenedor-tarjeta[data-id]")
  ].filter(tarjeta => tarjeta.id !== "tarjeta-agregar-producto");

  let unidadesDisponibles = 0;
  let valorInventario = 0;

  // RESUMEN DEL INVENTARIO
  tarjetas.forEach(tarjeta => {
    const id = tarjeta.dataset.id;
    const titulo = tarjeta.querySelector("h3");
    const precioElemento = tarjeta.querySelector(".precio");

    const nombre = titulo ? titulo.textContent.trim() : "Producto";
    const stock = obtenerStock(tarjeta, id);
    const precio = precioNumerico(
      precioElemento ? precioElemento.textContent : "0"
    );

    unidadesDisponibles += stock;
    valorInventario += stock * precio;

    const fila = document.createElement("tr");

    [
      nombre,
      String(stock),
      formatoPrecio(precio),
      formatoPrecio(stock * precio)
    ].forEach(texto => {
      fila.appendChild(crearElemento("td", "", texto));
    });

    listaResumen.appendChild(fila);
  });

  if (tarjetas.length === 0) {
    const fila = document.createElement("tr");
    const celda = crearElemento("td", "", "No hay productos registrados.");
    celda.colSpan = 4;
    fila.appendChild(celda);
    listaResumen.appendChild(fila);
  }

  // AGRUPAR LAS VENTAS POR PRODUCTO Y PRECIO UNITARIO
  const ventasAgrupadas = new Map();

  ventas.forEach(venta => {
    const nombre = String(
      venta.nombre || venta.producto || "Producto"
    ).trim();

    const precio = Number(
      venta.precioUnitario ?? venta.precio ?? 0
    );

    const cantidad = Number(venta.cantidad ?? venta.unidades ?? 0);
    const total = Number(venta.total ?? cantidad * precio);

    const clave = nombre.toLocaleLowerCase("es") + "|" + precio;

    if (!ventasAgrupadas.has(clave)) {
      ventasAgrupadas.set(clave, {
        nombre,
        precio,
        cantidad: 0,
        total: 0,
        fechas: []
      });
    }

    const grupo = ventasAgrupadas.get(clave);

    grupo.cantidad += cantidad;
    grupo.total += total;

    const fecha = venta.fecha || "Fecha no disponible";

    // Conservar cada fecha de compra sin repetir fechas idénticas.
    if (!grupo.fechas.includes(fecha)) {
      grupo.fechas.push(fecha);
    }
  });

  const unidadesVendidas = ventas.reduce(
    (suma, venta) =>
      suma + Number(venta.cantidad ?? venta.unidades ?? 0),
    0
  );

  const dineroVendido = ventas.reduce(
    (suma, venta) =>
      suma + Number(
        venta.total ??
        (Number(venta.cantidad ?? venta.unidades ?? 0) *
         Number(venta.precioUnitario ?? venta.precio ?? 0))
      ),
    0
  );

  // MOSTRAR UNA FILA POR PRODUCTO Y PRECIO
  ventasAgrupadas.forEach((grupo, clave) => {
  const fila = document.createElement("tr");

  const valores = [
    grupo.fechas.join("\n"),
    grupo.nombre,
    String(grupo.cantidad),
    formatoPrecio(grupo.precio),
    formatoPrecio(grupo.total)
  ];

  valores.forEach((valor, indice) => {
    const celda = crearElemento("td", "", valor);

    if (indice === 0) {
      celda.style.whiteSpace = "pre-line";
    }

    fila.appendChild(celda);
  });

  // Botón X al lado de esta fila
  const celdaEliminar = document.createElement("td");
  const botonX = document.createElement("button");

  botonX.type = "button";
  botonX.textContent = "X";
  botonX.title = "Eliminar este producto del historial";

  botonX.style.backgroundColor = "#dc2626";
  botonX.style.color = "white";
  botonX.style.border = "none";
  botonX.style.borderRadius = "5px";
  botonX.style.padding = "6px 11px";
  botonX.style.cursor = "pointer";
  botonX.style.fontWeight = "bold";

  botonX.addEventListener("click", () => {
  if (!confirm(
    `¿Eliminar toda la fila de "${grupo.nombre}" y devolver las unidades a la tienda?`
  )) {
    return;
  }

  const nombreGrupo = grupo.nombre.trim().toLocaleLowerCase("es");
  const precioGrupo = Number(grupo.precio);

  const ventasAnteriores = [...ventas];

  // Identificar todas las ventas que aparecen en esta fila.
  const ventasEliminadas = ventas.filter(venta => {
    const nombreVenta = String(
      venta.nombre || venta.producto || "Producto"
    ).trim().toLocaleLowerCase("es");

    const precioVenta = Number(
      venta.precioUnitario ?? venta.precio ?? 0
    );

    return nombreVenta === nombreGrupo &&
           precioVenta === precioGrupo;
  });

  if (ventasEliminadas.length === 0) return;

  // Sumar las unidades que deben regresar por cada producto.
  const devoluciones = new Map();

  for (const venta of ventasEliminadas) {
    const idProducto = venta.productoId;
    const cantidad = Number(venta.cantidad ?? venta.unidades ?? 0);

    if (!idProducto || !Number.isFinite(cantidad) || cantidad <= 0) {
      alert(
        "Una venta no tiene un ID de producto o una cantidad válida. " +
        "No se realizaron cambios."
      );
      return;
    }

    devoluciones.set(
      idProducto,
      (devoluciones.get(idProducto) || 0) + cantidad
    );
  }

  // Encontrar las tarjetas y guardar las existencias anteriores.
  const productosParaActualizar = [];

  for (const [idProducto, cantidad] of devoluciones) {
    const tarjeta = [
      ...contenedor.querySelectorAll(".contenedor-tarjeta[data-id]")
    ].find(item => item.dataset.id === String(idProducto));

    if (!tarjeta) {
      alert(
        `No se encontró la tarjeta de "${grupo.nombre}". ` +
        "No se eliminará el historial."
      );
      return;
    }

    productosParaActualizar.push({
      tarjeta,
      idProducto,
      cantidad,
      stockAnterior: obtenerStock(tarjeta, idProducto)
    });
  }

  // Devolver las unidades al inventario guardado.
  const productosGuardados = [];

  for (const producto of productosParaActualizar) {
    const nuevoStock = producto.stockAnterior + producto.cantidad;

    if (!guardarStock(producto.idProducto, nuevoStock)) {
      // Restaurar las existencias si ocurre un error.
      productosGuardados.reverse().forEach(item => {
        guardarStock(item.idProducto, item.stockAnterior);
      });

      alert(
        "No se pudieron actualizar todas las existencias. " +
        "El historial se conservará."
      );
      return;
    }

    productosGuardados.push(producto);
  }

  // Quitar del historial todas las ventas de esta fila.
  ventas = ventas.filter(venta => !ventasEliminadas.includes(venta));

  if (!guardar(CLAVES.ventas, ventas)) {
    ventas = ventasAnteriores;

    productosGuardados.reverse().forEach(item => {
      guardarStock(item.idProducto, item.stockAnterior);
    });

    alert(
      "No se pudo guardar el historial. " +
      "Se intentaron restaurar las existencias anteriores."
    );
    return;
  }

  // ACTUALIZAR LAS TARJETAS CON SU ID CORRECTO.
  productosParaActualizar.forEach(item => {
    actualizarTarjeta(item.tarjeta, item.idProducto);
  });

  // Actualizar resumen y contador de productos.
  actualizarResumen();
  actualizarContador();
  filtrarProductos();

  alert(
    `Se eliminó la fila de "${grupo.nombre}" y se devolvieron ` +
    `${grupo.cantidad} unidad(es) al inventario.`
  );
});

  celdaEliminar.appendChild(botonX);
  fila.appendChild(celdaEliminar);
  listaVentas.appendChild(fila);
});

  if (ventas.length === 0) {
    const fila = document.createElement("tr");
    const celda = crearElemento(
      "td",
      "",
      "Todavía no hay ventas registradas."
    );

    celda.colSpan = 5;
    fila.appendChild(celda);
    listaVentas.appendChild(fila);
  }

  // ACTUALIZAR LAS ESTADÍSTICAS
  document.getElementById("resumen-productos").textContent =
    tarjetas.length;

  document.getElementById("resumen-disponibles").textContent =
    unidadesDisponibles;

  document.getElementById("resumen-vendidas").textContent =
    unidadesVendidas;

  document.getElementById("resumen-compras").textContent =
    ventas.length;

  document.getElementById("resumen-dinero").textContent =
    formatoPrecio(dineroVendido);

  totalResumen.textContent =
    `Productos registrados: ${tarjetas.length} · ` +
    `Unidades disponibles: ${unidadesDisponibles} · ` +
    `Valor actual del inventario: ${formatoPrecio(valorInventario)}`;

  if (descripcionVentas) {
    descripcionVentas.textContent = ventas.length === 0
      ? "Todavía no se han registrado ventas."
      : `Se vendieron ${unidadesVendidas} unidad(es) en ` +
        `${ventas.length} compra(s). Total vendido: ` +
        formatoPrecio(dineroVendido) + ".";
  }
}

  function actualizarContador() {
    const tarjetas = [
      ...contenedor.querySelectorAll(".contenedor-tarjeta[data-id]")
    ].filter(tarjeta => tarjeta.id !== "tarjeta-agregar-producto");

    const visibles = tarjetas.filter(
      tarjeta => !tarjeta.classList.contains("oculto")
    );

    contador.textContent =
      `${visibles.length} producto(s) mostrado(s) de ` +
      `${tarjetas.length} registrado(s).`;
  }

  function filtrarProductos() {
    const texto = buscador.value.trim().toLocaleLowerCase("es");

    contenedor.querySelectorAll(".contenedor-tarjeta[data-id]").forEach(tarjeta => {
      if (tarjeta.id === "tarjeta-agregar-producto") {
        tarjeta.classList.remove("oculto");
        return;
      }

      tarjeta.classList.toggle(
        "oculto",
        !tarjeta.textContent.toLocaleLowerCase("es").includes(texto)
      );
    });

    actualizarContador();
  }

  function abrirPanelFormulario() {
    panelFormulario.classList.remove("oculto");
    panelFormulario.scrollIntoView({ behavior: "smooth", block: "start" });
    campoNombre.focus();
  }

  function limpiarFormulario() {
    formProducto.reset();
    campoStock.value = "10";
    vistaPrevia.src = "";
    vistaPrevia.classList.add("oculto");
  }

  function cerrarPanelFormulario() {
    panelFormulario.classList.add("oculto");
    limpiarFormulario();
  }

  /*
   * NUEVA FUNCIÓN:
   * Reinicia exclusivamente el registro de ventas.
   * No cambia inventario, existencias, productos nuevos,
   * nombres, precios, fotos, ediciones ni productos eliminados.
   */
  function reiniciarVenta() {
    const confirmar = confirm(
      "¿Deseas reiniciar la venta actual?\n\n" +
      "Se borrarán el historial de ventas, las unidades vendidas, " +
      "el número de compras y el dinero acumulado.\n\n" +
      "Las existencias y todos tus productos se conservarán."
    );

    if (!confirmar) return;

    // Guardar primero el historial vacío.
    // Si falla el almacenamiento, se conservan las ventas anteriores.
    if (!guardar(CLAVES.ventas, [])) {
      alert("No se pudo reiniciar la venta. Tus datos anteriores se conservan.");
      return;
    }

    // Solo cambia la variable del historial de ventas.
    ventas = [];

    // Actualiza los contadores y las tablas sin tocar el inventario.
    actualizarResumen();

    alert(
      "La venta se reinició correctamente.\n\n" +
      "El inventario y todos los productos se conservaron."
    );
  }

  function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caracter]);
  }

  function tablaParaExportar() {
    const tarjetas = [
      ...contenedor.querySelectorAll(".contenedor-tarjeta[data-id]")
    ].filter(tarjeta => tarjeta.id !== "tarjeta-agregar-producto");

    const filasProductos = tarjetas.map(tarjeta => {
      const nombre = tarjeta.querySelector("h3").textContent;
      const precio = precioNumerico(
        tarjeta.querySelector(".precio").textContent
      );
      const stock = obtenerStock(tarjeta, tarjeta.dataset.id);

      return `
        <tr>
          <td>${escaparHTML(nombre)}</td>
          <td>${stock}</td>
          <td>${formatoPrecio(precio)}</td>
          <td>${formatoPrecio(precio * stock)}</td>
        </tr>
      `;
    }).join("");

    const filasVentas = ventas.map(venta => `
      <tr>
        <td>${escaparHTML(venta.fecha || "")}</td>
        <td>${escaparHTML(venta.nombre || venta.producto || "")}</td>
        <td>${Number(venta.cantidad || 0)}</td>
        <td>${formatoPrecio(venta.precioUnitario ?? venta.precio ?? 0)}</td>
        <td>${formatoPrecio(venta.total || 0)}</td>
      </tr>
    `).join("");

    const unidadesDisponibles = tarjetas.reduce(
      (suma, tarjeta) =>
        suma + obtenerStock(tarjeta, tarjeta.dataset.id), 0
    );

    const unidadesVendidas = ventas.reduce(
      (suma, venta) => suma + Number(venta.cantidad || 0), 0
    );

    const totalVendido = ventas.reduce(
      (suma, venta) => suma + Number(venta.total || 0), 0
    );

    return `
      <h1>LETRA Y MÁS</h1>
      <p>Fecha del reporte: ${new Date().toLocaleString("es-GT")}</p>

      <h2>Resumen de ventas</h2>
      <p>Productos registrados: ${tarjetas.length}</p>
      <p>Unidades disponibles: ${unidadesDisponibles}</p>
      <p>Unidades vendidas: ${unidadesVendidas}</p>
      <p>Compras registradas: ${ventas.length}</p>
      <p><strong>Total de dinero vendido: ${formatoPrecio(totalVendido)}</strong></p>

      <h2>Inventario actual</h2>
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Disponible</th>
            <th>Precio unitario</th>
            <th>Valor del inventario</th>
          </tr>
        </thead>
        <tbody>${filasProductos}</tbody>
      </table>

      <h2>Historial de ventas</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto vendido</th>
            <th>Unidades</th>
            <th>Precio unitario</th>
            <th>Total de venta</th>
          </tr>
        </thead>
        <tbody>${
          filasVentas ||
          '<tr><td colspan="5">Todavía no hay ventas registradas.</td></tr>'
        }</tbody>
      </table>
    `;
  }

  function exportarResumen() {
    const formato = document.getElementById("formato-exportacion").value;
    const contenido = tablaParaExportar();

    const estilos = `
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #20232A;
        }
        h1, h2 {
          color: #007FB8;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0 25px;
        }
        th, td {
          border: 1px solid #AEB8C4;
          padding: 8px;
          text-align: left;
        }
        th {
          background: #DFF5FF;
        }
        p {
          line-height: 1.5;
        }
      </style>
    `;

    if (formato === "pdf") {
      const ventana = window.open("", "_blank");

      if (!ventana) {
        alert("Permite las ventanas emergentes para generar el PDF.");
        return;
      }

      ventana.document.open();
      ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Resumen LETRA Y MÁS</title>
          ${estilos}
        </head>
        <body>${contenido}</body>
        </html>
      `);
      ventana.document.close();
      ventana.focus();

      setTimeout(() => ventana.print(), 400);
      return;
    }

    const esExcel = formato === "excel";
    const tipo = esExcel
      ? "application/vnd.ms-excel;charset=utf-8;"
      : "application/msword;charset=utf-8;";

    const extension = esExcel ? "xls" : "doc";

    const documento = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Resumen LETRA Y MÁS</title>
        ${estilos}
      </head>
      <body>${contenido}</body>
      </html>
    `;

    const archivo = new Blob(["\ufeff", documento], { type: tipo });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `resumen_letra_y_mas.${extension}`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    
  }

  // Abrir y cerrar el resumen.
  botonResumen.addEventListener("click", () => {
    panelResumen.classList.toggle("oculto");
    actualizarResumen();

    if (!panelResumen.classList.contains("oculto")) {
      panelResumen.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  });

  cerrarResumen.addEventListener("click", () => {
    panelResumen.classList.add("oculto");
  });

  // NUEVO EVENTO DEL BOTÓN DE REINICIO.
  botonReiniciarVenta.addEventListener("click", reiniciarVenta);

  document.getElementById("boton-exportar")
    .addEventListener("click", exportarResumen);

  // Formulario de productos.
  abrirFormulario.addEventListener("click", abrirPanelFormulario);
  abrirFormularioTarjeta.addEventListener("click", abrirPanelFormulario);
  cerrarFormulario.addEventListener("click", cerrarPanelFormulario);
  cancelarFormulario.addEventListener("click", cerrarPanelFormulario);

  buscador.addEventListener("input", filtrarProductos);

  campoFoto.addEventListener("change", async () => {
    const archivo = campoFoto.files[0];

    if (!archivo) {
      vistaPrevia.classList.add("oculto");
      return;
    }

    if (!archivo.type.startsWith("image/")) {
      alert("Selecciona un archivo de imagen.");
      campoFoto.value = "";
      return;
    }

    if (archivo.size > 1024 * 1024) {
      alert("La fotografía debe pesar máximo 1 MB.");
      campoFoto.value = "";
      return;
    }

    try {
      const foto = await leerFoto(archivo);
      vistaPrevia.src = foto;
      vistaPrevia.classList.remove("oculto");
    } catch {
      alert("No se pudo leer la fotografía.");
    }
  });

  formProducto.addEventListener("submit", evento => {
    evento.preventDefault();

    const nombre = campoNombre.value.trim();
    const descripcion = campoDescripcion.value.trim();
    const precio = Number(campoPrecio.value);
    const stock = Number(campoStock.value);
    const archivo = campoFoto.files[0];

    if (
      !nombre ||
      !descripcion ||
      !Number.isFinite(precio) ||
      precio <= 0 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      alert("Completa correctamente todos los campos.");
      return;
    }

    function guardarProducto(foto) {
      const producto = {
        id: "nuevo-" + Date.now() + "-" +
          Math.random().toString(36).slice(2, 7),
        nombre,
        descripcion,
        precio,
        stock,
        foto
      };

      productosNuevos.push(producto);

      if (!guardar(CLAVES.nuevos, productosNuevos)) {
        productosNuevos.pop();
        return;
      }

      const inventarioAnterior = { ...inventario };
      inventario[producto.id] = stock;

      if (!guardar(CLAVES.inventario, inventario)) {
        productosNuevos = productosNuevos.filter(p => p.id !== producto.id);
        guardar(CLAVES.nuevos, productosNuevos);
        inventario = inventarioAnterior;
        guardar(CLAVES.inventario, inventario);
        return;
      }

      crearTarjetaNuevo(producto);
      cerrarPanelFormulario();
      filtrarProductos();
      actualizarResumen();

      alert("Producto agregado correctamente.");
    }

    if (!archivo) {
      guardarProducto("");
      return;
    }

    if (!archivo.type.startsWith("image/")) {
      alert("Selecciona un archivo de imagen.");
      return;
    }

    if (archivo.size > 1024 * 1024) {
      alert("La fotografía debe pesar máximo 1 MB.");
      return;
    }

    leerFoto(archivo)
      .then(guardarProducto)
      .catch(() => alert("No se pudo cargar la fotografía."));
  });

  // Conectar los productos originales que ya están en el HTML.
  [
    ...contenedor.querySelectorAll(".contenedor-tarjeta[data-id]")
  ].forEach(tarjeta => {
    if (tarjeta.id !== "tarjeta-agregar-producto") {
      conectarTarjeta(tarjeta, tarjeta.dataset.id);
    }
  });

  // Recuperar los productos nuevos guardados sin duplicarlos.
  productosNuevos.forEach(producto => {
    if (
      producto &&
      producto.id &&
      !eliminados.includes(producto.id)
    ) {
      crearTarjetaNuevo(producto);
    }
  });

  // ==========================================
  // VISTA PREVIA AL SELECCIONAR UN PRODUCTO
  // ==========================================

  const panelVistaProducto = document.createElement("aside");
  panelVistaProducto.id = "panel-vista-producto";
  panelVistaProducto.className = "panel-vista-producto oculto";
  panelVistaProducto.setAttribute("aria-label", "Vista previa del producto");

  panelVistaProducto.innerHTML = `
    <div class="cabecera-vista-producto">
      <h2>Detalle del producto</h2>
      <button
        type="button"
        class="cerrar-vista-producto"
        aria-label="Cerrar vista previa"
      >×</button>
    </div>

    <img class="imagen-vista-producto" alt="Imagen del producto">

    <h3 class="nombre-vista-producto"></h3>
    <p class="descripcion-vista-producto"></p>
    <p class="precio-vista-producto"></p>
    <p class="stock-vista-producto"></p>

    <button type="button" class="boton-vista-comprar">
      Comprar este producto
    </button>
  `;

  document.body.appendChild(panelVistaProducto);

  const imagenVista = panelVistaProducto.querySelector(
    ".imagen-vista-producto"
  );

  const nombreVista = panelVistaProducto.querySelector(
    ".nombre-vista-producto"
  );

  const descripcionVista = panelVistaProducto.querySelector(
    ".descripcion-vista-producto"
  );

  const precioVista = panelVistaProducto.querySelector(
    ".precio-vista-producto"
  );

  const stockVista = panelVistaProducto.querySelector(
    ".stock-vista-producto"
  );

  const botonComprarVista = panelVistaProducto.querySelector(
    ".boton-vista-comprar"
  );

  let tarjetaVistaActual = null;

  function cerrarVistaProducto() {
    panelVistaProducto.classList.add("oculto");

    if (tarjetaVistaActual) {
      tarjetaVistaActual.classList.remove("tarjeta-seleccionada");
    }

    tarjetaVistaActual = null;
  }

  function abrirVistaProducto(tarjeta) {
    if (
      !tarjeta ||
      tarjeta.id === "tarjeta-agregar-producto" ||
      !tarjeta.querySelector("h3")
    ) {
      return;
    }

    if (tarjetaVistaActual) {
      tarjetaVistaActual.classList.remove("tarjeta-seleccionada");
    }

    tarjetaVistaActual = tarjeta;
    tarjetaVistaActual.classList.add("tarjeta-seleccionada");

    const imagen = tarjeta.querySelector(".imagen-producto");
    const nombre = tarjeta.querySelector("h3");
    const descripcion = tarjeta.querySelector(
      ".contenido-tarjeta p:not(.precio)"
    );
    const precio = tarjeta.querySelector(".precio");

    nombreVista.textContent = nombre
      ? nombre.textContent.trim()
      : "Producto";

    descripcionVista.textContent = descripcion
      ? descripcion.textContent.trim()
      : "Sin descripción disponible.";

    precioVista.textContent = precio
      ? precio.textContent.trim()
      : "Precio no disponible";

    if (imagen) {
      imagenVista.src = imagen.src;
      imagenVista.alt = imagen.alt || nombreVista.textContent;
      imagenVista.style.display = "block";
    } else {
      imagenVista.removeAttribute("src");
      imagenVista.alt = "";
      imagenVista.style.display = "none";
    }

    const stock = obtenerStock(tarjeta, tarjeta.dataset.id);

    stockVista.textContent = stock > 0
      ? `Disponibles: ${stock}`
      : "Producto agotado";

    stockVista.classList.toggle("agotado", stock <= 0);

    botonComprarVista.disabled = stock <= 0;
    botonComprarVista.textContent = stock > 0
      ? "Comprar este producto"
      : "Producto agotado";

    panelVistaProducto.classList.remove("oculto");
  }

  // Seleccionar una tarjeta abre su vista previa.
  // Los botones y controles internos conservan su funcionamiento.
  contenedor.addEventListener("click", evento => {
    if (evento.target.closest(
      "button, input, textarea, select, label, form"
    )) {
      return;
    }

    const tarjeta = evento.target.closest(
      ".contenedor-tarjeta[data-id]"
    );

    if (tarjeta && contenedor.contains(tarjeta)) {
      abrirVistaProducto(tarjeta);
    }
  });

  // Cerrar la vista previa.
  panelVistaProducto
    .querySelector(".cerrar-vista-producto")
    .addEventListener("click", cerrarVistaProducto);

  // El botón de la vista previa utiliza la compra de la tarjeta
  // original para conservar el control de existencias y ventas.
  botonComprarVista.addEventListener("click", () => {
    if (!tarjetaVistaActual) return;

    const botonComprarOriginal = tarjetaVistaActual.querySelector(
      ".boton-comprar"
    );

    const cantidadOriginal = tarjetaVistaActual.querySelector(
      ".cantidad-compra"
    );

    if (!botonComprarOriginal || !cantidadOriginal) return;

    if (botonComprarOriginal.disabled) {
      alert("Este producto está agotado.");
      return;
    }

    // La compra desde la vista previa utiliza una unidad.
    cantidadOriginal.value = "1";
    botonComprarOriginal.click();
  });

  // Cerrar con Escape.
  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
      cerrarVistaProducto();
    }
  });

  panelVistaProducto
    .querySelector(".cerrar-vista-producto")
    .addEventListener("click", cerrarVistaProducto);

  document.getElementById("anio").textContent =
    new Date().getFullYear();

  filtrarProductos();
  actualizarResumen();
});

