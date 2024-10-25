import { useState } from 'react';
import { useParams } from 'react-router-dom';
import DatosTab from './PlanDeInversion/DatosTab';
import ValidacionesTab from './PlanDeInversion/ValidacionesTab';
import FormulacionTab from './PlanDeInversion/FormulacionTab';
import EncuestaSalidaTab from './PlanDeInversion/EncuestaSalidaTab';
import GenerarFichaTab from './PlanDeInversion/GenerarFichaTab';

export default function PlanDeInversion() {
  const { id } = useParams(); // ID del registro de caracterización
  const [activeTab, setActiveTab] = useState('Datos');

  return (
    <div className="content-wrapper">
      <section className="content-header">
        <h1>Plan de Inversión - Registro {id}</h1>
      </section>
      <section className="content">
        {/* Pestañas */}
        <ul className="nav nav-tabs">
          <li className={`nav-item ${activeTab === 'Datos' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Datos');
              }}
            >
              Datos
            </a>
          </li>
          <li className={`nav-item ${activeTab === 'Validaciones' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Validaciones');
              }}
            >
              Validaciones
            </a>
          </li>
          <li className={`nav-item ${activeTab === 'Formulacion' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Formulacion');
              }}
            >
              Formulación
            </a>
          </li>
          <li className={`nav-item ${activeTab === 'EncuestaSalida' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('EncuestaSalida');
              }}
            >
              Encuesta de Salida
            </a>
          </li>
          <li className={`nav-item ${activeTab === 'GenerarFicha' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('GenerarFicha');
              }}
            >
              Generar Ficha
            </a>
          </li>
        </ul>

        {/* Contenido de las pestañas */}
        <div className="tab-content">
          {activeTab === 'Datos' && <DatosTab id={id} />}
          {activeTab === 'Validaciones' && <ValidacionesTab id={id} />}
          {activeTab === 'Formulacion' && <FormulacionTab id={id} />}
          {activeTab === 'EncuestaSalida' && <EncuestaSalidaTab id={id} />}
          {activeTab === 'GenerarFicha' && <GenerarFichaTab id={id} />}
        </div>
      </section>
    </div>
  );
}
