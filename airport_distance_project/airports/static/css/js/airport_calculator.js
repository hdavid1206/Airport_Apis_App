class AirportCalculator {
    constructor() {
        this.isCalculating = false;
        this.form = null;
        this.inputs = [];
        this.button = null;
        
        this.init();
    }

    /**
     * Inicializar la aplicación
     */
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupElements();
            this.attachEventListeners();
            this.setupValidation();
        });
    }

    /**
     * Configurar elementos del DOM
     */
    setupElements() {
        this.form = document.getElementById('airportForm');
        this.inputs = this.form.querySelectorAll('input[type="text"]');
        this.button = document.getElementById('calcularBtn');
        
        if (!this.form || !this.button) {
            console.error('Elementos del formulario no encontrados');
            return;
        }
    }

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Evento de envío del formulario
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!this.isCalculating) {
                this.calculateDistance();
            }
        });

        // Convertir automáticamente a mayúsculas y validar
        this.inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleInputChange(e.target);
            });

            input.addEventListener('blur', (e) => {
                this.validateInput(e.target);
            });

            input.addEventListener('focus', (e) => {
                this.clearInputError(e.target);
            });
        });
    }

    /**
     * Configurar validación en tiempo real
     */
    setupValidation() {
        this.inputs.forEach(input => {
            // Agregar indicador de validez visual
            this.updateInputValidation(input);
        });
    }

    /**
     * Manejar cambios en los inputs
     */
    handleInputChange(input) {
        // Convertir a mayúsculas
        const valor = input.value.toUpperCase().replace(/[^A-Z]/g, '');
        input.value = valor;

        // Validación visual en tiempo real
        this.updateInputValidation(input);

        // Verificar si el formulario está completo
        this.checkFormCompleteness();
    }

    /**
     * Actualizar validación visual del input
     */
    updateInputValidation(input) {
        const formGroup = input.closest('.form-group');
        const valor = input.value.trim();

        // Limpiar clases previas
        formGroup.classList.remove('valid', 'invalid');

        if (valor.length === 0) {
            // Campo vacío
            return;
        } else if (valor.length === 3 && /^[A-Z]{3}$/.test(valor)) {
            // Campo válido
            formGroup.classList.add('valid');
            input.style.borderColor = 'rgba(16, 185, 129, 0.6)';
        } else {
            // Campo inválido
            formGroup.classList.add('invalid');
            input.style.borderColor = 'rgba(239, 68, 68, 0.6)';
        }
    }

    /**
     * Validar input específico
     */
    validateInput(input) {
        const valor = input.value.trim();
        
        if (valor.length > 0 && valor.length !== 3) {
            this.showInputError(input, 'El código debe tener exactamente 3 letras');
            return false;
        }
        
        if (valor.length > 0 && !/^[A-Z]{3}$/.test(valor)) {
            this.showInputError(input, 'Solo se permiten letras');
            return false;
        }

        this.clearInputError(input);
        return true;
    }

    /**
     * Mostrar error en input específico
     */
    showInputError(input, message) {
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

    /**
     * Limpiar error del input
     */
    clearInputError(input) {
        const formGroup = input.closest('.form-group');
        const errorElement = formGroup.querySelector('.input-error');
        
        if (errorElement) {
            errorElement.remove();
        }
        
        input.style.borderColor = '';
    }

    /**
     * Verificar si el formulario está completo y válido
     */
    checkFormCompleteness() {
        const allValid = Array.from(this.inputs).every(input => {
            const valor = input.value.trim();
            return valor.length === 3 && /^[A-Z]{3}$/.test(valor);
        });

        // Habilitar/deshabilitar botón
        this.button.disabled = !allValid;
        
        if (allValid) {
            this.button.style.opacity = '1';
        } else {
            this.button.style.opacity = '0.7';
        }
    }

    /**
     * Calcular distancia
     */
    async calculateDistance() {
        try {
            this.isCalculating = true;
            this.startLoading();

            // Validar formulario antes de enviar
            if (!this.validateForm()) {
                return;
            }

            // Obtener datos del formulario
            const formData = new FormData(this.form);
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

            // Realizar petición
            const response = await fetch('/calculate/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': csrfToken
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showResults(data);
            } else {
                this.showError(data.error);
            }

        } catch (error) {
            console.error('Error:', error);
            this.showError('Error de conexión. Por favor, inténtelo de nuevo.');
        } finally {
            this.stopLoading();
            this.isCalculating = false;
        }
    }

    /**
     * Validar formulario completo
     */
    validateForm() {
        const origen = this.form.querySelector('#aeropuerto_origen').value.trim();
        const destino = this.form.querySelector('#aeropuerto_destino').value.trim();

        // Validaciones básicas
        if (!origen || !destino) {
            this.showError('Debe ingresar ambos códigos de aeropuertos');
            return false;
        }

        if (origen.length !== 3 || destino.length !== 3) {
            this.showError('Los códigos deben tener exactamente 3 letras');
            return false;
        }

        if (!/^[A-Z]{3}$/.test(origen) || !/^[A-Z]{3}$/.test(destino)) {
            this.showError('Los códigos solo pueden contener letras');
            return false;
        }

        if (origen === destino) {
            this.showError('Los aeropuertos de origen y destino deben ser diferentes');
            return false;
        }

        return true;
    }

    /**
     * Iniciar estado de carga
     */
    startLoading() {
        // Ocultar resultados y errores previos
        this.hideResults();
        this.hideError();
        
        // Mostrar indicador de carga
        this.showLoading();
        
        // Deshabilitar botón
        this.button.disabled = true;
        this.button.textContent = 'Calculando...';
        this.button.classList.add('loading');
    }

    /**
     * Detener estado de carga
     */
    stopLoading() {
        this.hideLoading();
        this.button.disabled = false;
        this.button.textContent = 'Calcular Distancia';
        this.button.classList.remove('loading');
    }

    /**
     * Mostrar indicador de carga
     */
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
            loading.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**
     * Ocultar indicador de carga
     */
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    /**
     * Mostrar resultados
     */
    showResults(data) {
        // Rellenar información de origen
        this.setElementText('origen-codigo', data.aeropuerto_origen.codigo);
        this.setElementText('origen-nombre', data.aeropuerto_origen.nombre);
        this.setElementText('origen-ciudad', data.aeropuerto_origen.ciudad);
        this.setElementText('origen-pais', data.aeropuerto_origen.pais);
        
        // Rellenar información de destino
        this.setElementText('destino-codigo', data.aeropuerto_destino.codigo);
        this.setElementText('destino-nombre', data.aeropuerto_destino.nombre);
        this.setElementText('destino-ciudad', data.aeropuerto_destino.ciudad);
        this.setElementText('destino-pais', data.aeropuerto_destino.pais);
        
        // Rellenar distancias con formato de números
        this.setElementText('distancia-km', this.formatNumber(data.distancia_km));
        this.setElementText('distancia-miles', this.formatNumber(data.distancia_miles));
        this.setElementText('distancia-nauticas', this.formatNumber(data.distancia_millas_nauticas));
        
        // Mostrar sección de resultados
        const resultados = document.getElementById('resultados');
        if (resultados) {
            resultados.style.display = 'block';
            
            // Scroll suave hacia los resultados
            setTimeout(() => {
                resultados.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }

        // Mostrar notificación de éxito
        this.showSuccessMessage('¡Distancia calculada correctamente!');
    }

    /**
     * Establecer texto en elemento por ID
     */
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text || 'No disponible';
        }
    }

    /**
     * Formatear número con separadores de miles
     */
    formatNumber(number) {
        if (number === null || number === undefined) return 'No disponible';
        return Number(number).toLocaleString('es-ES', {
            maximumFractionDigits: 0
        });
    }

    /**
     * Mostrar mensaje de éxito
     */
    showSuccessMessage(message) {
        // Crear elemento de éxito temporal
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
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(successEl);

        // Remover después de 3 segundos
        setTimeout(() => {
            successEl.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => successEl.remove(), 300);
        }, 3000);
    }

    /**
     * Mostrar error
     */
    showError(mensaje) {
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.textContent = mensaje;
            errorEl.style.display = 'block';
            
            // Scroll hacia el error
            setTimeout(() => {
                errorEl.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);

            // Auto-ocultar después de 8 segundos
            setTimeout(() => {
                this.hideError();
            }, 8000);
        }
    }

    /**
     * Ocultar error
     */
    hideError() {
        const errorEl = document.getElementById('error');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    /**
     * Mostrar resultados
     */
    showResults(data) {
        const resultados = document.getElementById('resultados');
        if (resultados) {
            resultados.style.display = 'block';
        }
    }

    /**
     * Ocultar resultados
     */
    hideResults() {
        const resultados = document.getElementById('resultados');
        if (resultados) {
            resultados.style.display = 'none';
        }
    }

    /**
     * Nueva consulta - limpiar formulario
     */
    newQuery() {
        // Limpiar formulario
        this.form.reset();
        
        // Limpiar validaciones visuales
        this.inputs.forEach(input => {
            input.style.borderColor = '';
            this.clearInputError(input);
            const formGroup = input.closest('.form-group');
            formGroup.classList.remove('valid', 'invalid');
        });
        
        // Ocultar resultados y errores
        this.hideResults();
        this.hideError();
        
        // Scroll hacia arriba
        document.querySelector('h1').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Enfocar primer input
        setTimeout(() => {
            this.inputs[0].focus();
        }, 500);
    }

    /**
     * Método público para nueva consulta
     */
    static newQuery() {
        if (window.airportCalculator) {
            window.airportCalculator.newQuery();
        }
    }
}

// Funciones globales para compatibilidad
function nuevaConsulta() {
    AirportCalculator.newQuery();
}

function validarInput(input) {
    if (window.airportCalculator) {
        window.airportCalculator.handleInputChange(input);
    }
}

// Estilos CSS para animaciones adicionales
const additionalStyles = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }

    .input-error {
        animation: shake 0.3s ease-in-out;
    }

    .success-message {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
`;

// Inyectar estilos adicionales
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Inicializar la aplicación
window.airportCalculator = new AirportCalculator();