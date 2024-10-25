import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function PiTableList() {
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [fieldsData, setFieldsData] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);

  const [multiSelectFields, setMultiSelectFields] = useState([]);

  const navigate = useNavigate();

  const tableName = 'inscription_caracterizacion';

  // Función para obtener columnas y registros de la tabla
  const fetchTableData = async (savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      // Obtener campos con información completa
      const fieldsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/tables/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const fetchedColumns = fieldsResponse.data.map((column) => column.column_name);
      setColumns(fetchedColumns);
      setFieldsData(fieldsResponse.data);

      // Identificar campos de selección múltiple (claves foráneas)
      const multiSelectFieldsArray = fieldsResponse.data
        .filter((column) => column.constraint_type === 'FOREIGN KEY')
        .map((column) => column.column_name);

      setMultiSelectFields(multiSelectFieldsArray);

      // Si hay columnas visibles guardadas en localStorage, úsalas; si no, muestra todas las columnas por defecto
      const localVisibleColumns =
        savedVisibleColumns || JSON.parse(localStorage.getItem('visibleColumns')) || [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns);
      }

      // Obtener registros filtrados
      const recordsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/pi/caracterizacion/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRecords(recordsResponse.data);

      setLoading(false);
    } catch (error) {
      console.error('Error obteniendo los registros:', error);

      if (error.response && error.response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError('Error obteniendo los registros');
      }

      setLoading(false);
    }
  };

  // Cargar los datos al montar el componente
  useEffect(() => {
    fetchTableData();
  }, [navigate]);

  // Manejar Select2 con persistencia
  useEffect(() => {
    if (window.$) {
      window.$('.select2').select2({
        closeOnSelect: false,
        width: '100%',
      });

      window.$('.select2').on('change', (e) => {
        const selectedOptions = Array.from(e.target.selectedOptions || []).map(
          (option) => option.value
        );
        setVisibleColumns(selectedOptions);
        localStorage.setItem('visibleColumns', JSON.stringify(selectedOptions));
      });

      const savedVisibleColumns = JSON.parse(localStorage.getItem('visibleColumns'));
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        window.$('.select2').val(savedVisibleColumns).trigger('change');
      }
    }

    const savedSearch = localStorage.getItem('searchQuery');
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns]);

  return (
    <div className="content-wrapper">
      {/* Cabecera */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Plan de Inversión</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-light mr-2"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                {showSearchBar ? 'Ocultar búsqueda' : 'Mostrar búsqueda'}
              </button>
              {/* Eliminamos el selector de tablas */}
            </div>
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="content">
        <div className="container-fluid">
          {/* Otros contenidos */}
          <div className="row">
            <div className="col-12">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="card">
                <div className="card-body table-responsive p-0">
                  {/* Barra de búsqueda */}
                  {showSearchBar && (
                    <div className="row mb-3">
                      <div className="col-sm-6">
                        <div className="form-group">
                          <input
                            type="text"
                            className="form-control search-input"
                            placeholder="Buscar en columnas visibles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Select de columnas */}
                  {columns.length > 0 && (
                    <div className="form-group mb-3">
                      <label>Selecciona las columnas a mostrar:</label>
                      <select className="select2" multiple="multiple" style={{ width: '100%' }}>
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Tabla de registros */}
                  {loading ? (
                    <div className="d-flex justify-content-center p-3">Cargando...</div>
                  ) : (
                    <table className="table table-hover text-nowrap minimal-table">
                      <thead>
                        <tr>
                          {visibleColumns.length > 0 &&
                            visibleColumns.map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
  {records.length > 0 &&
    records.map((record) => (
      <tr key={record.id}>
        {visibleColumns.map((column) => (
          <td key={column}>{record[column]}</td>
        ))}
        <td>
          <button
            className="btn btn-sm btn-primary mb-1"
            onClick={() => navigate(`/plan-inversion/${record.id}`)}
          >
            Plan de Inversión
          </button>
          <br />
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => navigate(`/table/${tableName}/record/${record.id}`)}
          >
            Editar
          </button>
        </td>
      </tr>
    ))}
</tbody>
                    </table>
                  )}

                  {/* Botón para limpiar filtros */}
                  <div className="mt-3">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setVisibleColumns(columns);
                        setSearch('');
                        localStorage.removeItem('visibleColumns');
                        localStorage.removeItem('searchQuery');
                        fetchTableData();
                      }}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Fin de otros contenidos */}
        </div>
      </section>
    </div>
  );
}

