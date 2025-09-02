// Variables globales
let isCalculating = false;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM cargado, inicializando calculadora...');
    initializeCalculator();
});

function initializeCalculator() {
    const form = document.getElementById('airportForm');
    const inputs = form.querySelectorAll('input[type="text"]');
    const button = document.getElementById('calcularBtn');
    
    console.log('Elementos encontrados:', { form: !!form, inputs: inputs.length, button: !!button });
    
    // Convertir automáticamente a mayúsculas y validar
    inputs.forEach(input => {
        input.addEventListener('input', function(e) {
            // Solo permitir letras y convertir a mayúsculas
            let valor = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
            e.target.value = valor;
            
            // Validación visual
            updateInputValidation(e.target);
            checkFormCompleteness();
        });

        input.addEventListener('blur', function(e) {
            validateInput(e.target);
        });

        input.addEventListener('focus', function(e) {
            clearInputError(e.target);
        });
    });
    
    // Event listener para el formulario
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Formulario enviado');
        
        if (!isCalculating) {
            calcularDistancia();
        }
    });
}

function updateInputValidation(input) {
    const valor = input.value.trim();
    
    if (valor.length === 0) {
        input.style.borderColor = '';
        return;
    } else if (valor.length === 3 && /^[A-Z]{3}$/.test(valor)) {
        input.style.borderColor = 'rgba(16, 185, 129, 0.6)';
    } else {
        input.style.borderColor = 'rgba(239, 68, 68, 0.6)';
    }
}

function validateInput(input) {
    const valor = input.value.trim();
    
    if (valor.length > 0 && valor.length !== 3) {
        showInputError(input, 'El código debe tener exactamente 3 letras');
        return false;
    }
    
    if (valor.length > 0 && !/^[A-Z]{3}$/.test(valor)) {
        showInputError(input, 'Solo se permiten letras');
        return false;
    }

    clearInputError(input);
    return true;
}

function showInputError(input, message) {
    const formGroup = input.closest('.form-group');
    let errorElement = formGroup.querySelector('.input-error');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'input-error';
        errorElement.style.cssText = `
            color: #ef4444;
            font-size: 0.8rem;
            margin-top: 0.5rem;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        `;
        formGroup.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
    input.style.borderColor = 'rgba(239, 68, 68, 0.6)';
}

function clearInputError(input) {
    const formGroup = input.closest('.form-group');
    const errorElement = formGroup.querySelector('.input-error');
    
    if (errorElement) {
        errorElement.remove();
    }
    
    input.style.borderColor = '';
}

function checkFormCompleteness() {
    const inputs = document.querySelectorAll('#airportForm input[type="text"]');
    const button = document.getElementById('calcularBtn');
    
    const allValid = Array.from(inputs).every(input => {
        const valor = input.value.trim();
        return valor.length === 3 && /^[A-Z]{3}$/.test(valor);
    });

    button.disabled = !allValid;
    button.style.opacity = allValid ? '1' : '0.7';
}

function calcularDistancia() {
    console.log('Iniciando cálculo de distancia...');
    
    isCalculating = true;
    startLoading();

    // Validar formulario antes de enviar
    if (!validateForm()) {
        stopLoading();
        isCalculating = false;
        return;
    }

    // Obtener datos del formulario
    const formData = new FormData(document.getElementById('airportForm'));
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    
    console.log('Datos a enviar:', {
        origen: formData.get('aeropuerto_origen'),
        destino: formData.get('aeropuerto_destino')
    });

    // Realizar petición
    fetch('/calculate/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Datos recibidos:', data);
        
        if (data.success) {
            mostrarResultados(data);
        } else {
            mostrarError(data.error);
        }
    })
    .catch(error => {
        console.error('Error en la petición:', error);
        mostrarError('Error de conexión con el servidor. Por favor, verifique su conexión a internet e intente nuevamente.');
    })
    .finally(() => {
        stopLoading();
        isCalculating = false;
    });
}

function validateForm() {
    const origen = document.getElementById('aeropuerto_origen').value.trim();
    const destino = document.getElementById('aeropuerto_destino').value.trim();

    if (!origen || !destino) {
        mostrarError('Debe ingresar ambos códigos de aeropuertos');
        return false;
    }

    if (origen.length !== 3 || destino.length !== 3) {
        mostrarError('Los códigos deben tener exactamente 3 letras');
        return false;
    }

    if (!/^[A-Z]{3}$/.test(origen) || !/^[A-Z]{3}$/.test(destino)) {
        mostrarError('Los códigos solo pueden contener letras');
        return false;
    }

    if (origen === destino) {
        mostrarError('Los aeropuertos de origen y destino deben ser diferentes');
        return false;
    }

    return true;
}

function startLoading() {
    hideResults();
    hideError();
    showLoading();
    
    const btn = document.getElementById('calcularBtn');
    btn.disabled = true;
    btn.textContent = 'Calculando...';
    btn.classList.add('loading');
}

function stopLoading() {
    hideLoading();
    const btn = document.getElementById('calcularBtn');
    btn.disabled = false;
    btn.textContent = 'Calcular Distancia';
    btn.classList.remove('loading');
}

function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'block';
        loading.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

function mostrarResultados(data) {
    console.log('Mostrando resultados:', data);
    
    // Información de origen
    setElementText('origen-codigo', data.aeropuerto_origen.codigo);
    setElementText('origen-nombre', data.aeropuerto_origen.nombre);
    setElementText('origen-ciudad', data.aeropuerto_origen.ciudad);
    setElementText('origen-pais', data.aeropuerto_origen.pais);
    
    // Información de destino
    setElementText('destino-codigo', data.aeropuerto_destino.codigo);
    setElementText('destino-nombre', data.aeropuerto_destino.nombre);
    setElementText('destino-ciudad', data.aeropuerto_destino.ciudad);
    setElementText('destino-pais', data.aeropuerto_destino.pais);
    
    // Distancias con formato
    setElementText('distancia-km', formatNumber(data.distancia_km));
    setElementText('distancia-miles', formatNumber(data.distancia_miles));
    setElementText('distancia-nauticas', formatNumber(data.distancia_millas_nauticas));
    
    // Mostrar sección de resultados
    showResults();
}

function setElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text || 'No disponible';
    } else {
        console.warn(`Elemento con ID '${id}' no encontrado`);
    }
}

function formatNumber(number) {
    if (number === null || number === undefined) return 'No disponible';
    return Number(number).toLocaleString('es-ES', {
        maximumFractionDigits: 0
    });
}

function showResults() {
    const resultados = document.getElementById('resultados');
    if (resultados) {
        resultados.style.display = 'block';
        
        setTimeout(() => {
            resultados.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);
    }
    
    showSuccessMessage('¡Distancia calculada correctamente!');
}

function showSuccessMessage(message) {
    const successEl = document.createElement('div');
    successEl.className = 'success-message';
    successEl.textContent = message;
    successEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        z-index: 1000;
        font-weight: 500;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease-out;
    `;

    document.body.appendChild(successEl);
    
    // Mostrar con animación
    setTimeout(() => {
        successEl.style.opacity = '1';
        successEl.style.transform = 'translateX(0)';
    }, 10);

    // Remover después de 3 segundos
    setTimeout(() => {
        successEl.style.opacity = '0';
        successEl.style.transform = 'translateX(100px)';
        setTimeout(() => successEl.remove(), 300);
    }, 3000);
}

function hideResults() {
    const resultados = document.getElementById('resultados');
    if (resultados) {
        resultados.style.display = 'none';
    }
}

function mostrarError(mensaje) {
    console.error('Error:', mensaje);
    
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.innerHTML = mensaje;
        errorEl.style.display = 'block';
        
        setTimeout(() => {
            errorEl.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);

        // Auto-ocultar después de 12 segundos para errores largos
        setTimeout(() => {
            hideError();
        }, 12000);
    }
}

function hideError() {
    const errorEl = document.getElementById('error');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function nuevaConsulta() {
    console.log('Nueva consulta solicitada');
    
    // Limpiar formulario
    const form = document.getElementById('airportForm');
    form.reset();
    
    // Limpiar validaciones visuales
    const inputs = form.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        input.style.borderColor = '';
        clearInputError(input);
    });
    
    // Ocultar resultados y errores
    hideResults();
    hideError();
    
    // Scroll hacia arriba
    document.querySelector('h1').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
    
    // Enfocar primer input
    setTimeout(() => {
        const firstInput = document.getElementById('aeropuerto_origen');
        if (firstInput) {
            firstInput.focus();
        }
    }, 500);
}

// Funciones globales para compatibilidad con el HTML
window.calcularDistancia = calcularDistancia;
window.mostrarError = mostrarError;
window.mostrarResultados = mostrarResultados;
window.nuevaConsulta = nuevaConsulta;