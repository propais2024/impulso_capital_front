import { useState } from 'react';
import { useParams } from 'react-router-dom';
import DatosTab from './PlanDeInversion/DatosTab';
import ValidacionesTab from './PlanDeInversion/ValidacionesTab';
import FormulacionTab from './PlanDeInversion/FormulacionTab';
import AnexosTab from './PlanDeInversion/AnexosTab';
import EncuestaSalidaTab from './PlanDeInversion/EncuestaSalidaTab';
import GenerarPDF from './PlanDeInversion/GenerarPDF';
import DiagnosticoTab from './PlanDeInversion/DiagnosticoTab';
import ActivosTab from './PlanDeInversion/ActivosTab';
import CaracteristicasTab from './PlanDeInversion/CaracteristicasTab'; // Importar CaracteristicasTab

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
          <li className={`nav-item ${activeTab === 'Diagnostico' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Diagnostico');
              }}
            >
              Diagnóstico
            </a>
          </li>
          <li className={`nav-item ${activeTab === 'Activos' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Activos');
              }}
            >
              Activos
            </a>
          </li>
          <li className={`nav-item ${activeTab === 'Caracteristicas' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Caracteristicas');
              }}
            >
              Características
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
          <li className={`nav-item ${activeTab === 'Anexos' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('Anexos');
              }}
            >
              Anexos
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
          <li className={`nav-item ${activeTab === 'GenerarPDF' ? 'active' : ''}`}>
            <a
              href="#"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('GenerarPDF');
              }}
            >
              Generar PDF
            </a>
          </li>
        </ul>

       
        <div className="tab-content">
          {activeTab === 'Datos' && <DatosTab id={id} />}
          {activeTab === 'Diagnostico' && <DiagnosticoTab id={id} />}
          {activeTab === 'Activos' && <ActivosTab id={id} />}
          {activeTab === 'Caracteristicas' && <CaracteristicasTab id={id} />}
          {activeTab === 'Validaciones' && <ValidacionesTab id={id} />}
          {activeTab === 'Formulacion' && <FormulacionTab id={id} />}
          {activeTab === 'Anexos' && <AnexosTab id={id} />}
          {activeTab === 'EncuestaSalida' && <EncuestaSalidaTab id={id} />}
          {activeTab === 'GenerarPDF' && <GenerarPDF id={id} />}
        </div>
      </section>
    </div>
  );
} 
