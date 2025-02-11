import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './css/UsersList.css'; // Ajusta la ruta si es necesario

export default function ProviderTableList() {
  // Estados y variables
  const [tables, setTables] = useState([]); 
  const [selectedTable, setSelectedTable] = useState(''); 
  const [isPrimaryTable, setIsPrimaryTable] = useState(false); 
  const [records, setRecords] = useState([]); 
  const [columns, setColumns] = useState([]); 
  const [fieldsData, setFieldsData] = useState([]); 
  const [visibleColumns, setVisibleColumns] = useState([]); 
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState(null); 
  const [search, setSearch] = useState(''); 
  const [showSearchBar, setShowSearchBar] = useState(false); 

  const [selectedRecords, setSelectedRecords] = useState([]); 
  const [multiSelectFields, setMultiSelectFields] = useState([]); 
  const [bulkUpdateData, setBulkUpdateData] = useState({}); 
  const [fieldOptions, setFieldOptions] = useState({}); 

  const navigate = useNavigate();

  // Claves únicas para evitar conflictos entre módulos
  const LOCAL_STORAGE_TABLE_KEY = 'providerSelectedTable';
  const LOCAL_STORAGE_COLUMNS_KEY = 'providerVisibleColumns';
  const LOCAL_STORAGE_SEARCH_KEY = 'providerSearchQuery';

  // 1. Función para obtener el role_id del usuario
  const getLoggedUserRoleId = () => localStorage.getItem('role_id') || null;

  // Función para obtener columnas y registros de la tabla seleccionada
  const fetchTableData = async (tableName, savedVisibleColumns = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');

      // Obtener campos con información completa
      const fieldsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/fields`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider', // Especificamos que estamos trabajando con tablas de proveedores
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

      // Manejar columnas visibles (persistencia)
      const localVisibleColumns =
        savedVisibleColumns ||
        JSON.parse(localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)) ||
        [];
      if (localVisibleColumns.length > 0) {
        setVisibleColumns(localVisibleColumns);
      } else {
        setVisibleColumns(fetchedColumns);
      }

      // Obtener registros
      const recordsResponse = await axios.get(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${tableName}/records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider',
          },
        }
      );
      setRecords(recordsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setError('Error obteniendo los registros');
      setLoading(false);
    }
  };

  // Cargar las tablas y los filtros guardados desde el localStorage al montar
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          'https://impulso-capital-back.onrender.com/api/inscriptions/tables',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              tableType: 'provider',
            },
          }
        );
        setTables(response.data || []);

        // Cargar la tabla seleccionada y las columnas visibles guardadas
        const savedTable = localStorage.getItem(LOCAL_STORAGE_TABLE_KEY);
        const savedVisibleColumns = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)
        );

        if (savedTable) {
          setSelectedTable(savedTable);

          const selectedTableObj = response.data.find(
            (table) => table.table_name === savedTable
          );
          setIsPrimaryTable(selectedTableObj?.is_primary || false);

          fetchTableData(savedTable, savedVisibleColumns);
        }
      } catch (error) {
        console.error(error);
        setError('Error obteniendo las tablas');
      }
    };

    fetchTables();
  }, []);

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
        localStorage.setItem(
          LOCAL_STORAGE_COLUMNS_KEY,
          JSON.stringify(selectedOptions)
        );
      });

      // Cargar las columnas visibles guardadas
      const savedVisibleColumns = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)
      );
      if (savedVisibleColumns && savedVisibleColumns.length > 0) {
        window.$('.select2').val(savedVisibleColumns).trigger('change');
      }
    }

    // Cargar la búsqueda persistente
    const savedSearch = localStorage.getItem(LOCAL_STORAGE_SEARCH_KEY);
    if (savedSearch) {
      setSearch(savedSearch);
    }
  }, [columns]);

  // Manejar la selección de tabla
  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    localStorage.setItem(LOCAL_STORAGE_TABLE_KEY, tableName);

    if (tableName) {
      const selectedTableObj = tables.find(
        (table) => table.table_name === tableName
      );
      setIsPrimaryTable(selectedTableObj?.is_primary || false);

      const savedVisibleColumns = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY)
      );
      fetchTableData(tableName, savedVisibleColumns);
    } else {
      setRecords([]);
      setIsPrimaryTable(false);
    }
  };

  // Función para obtener el valor a mostrar en una columna
  const getColumnDisplayValue = (record, column) => {
    if (multiSelectFields.includes(column)) {
      // Es un campo de clave foránea
      const foreignKeyValue = record[column];
      const fieldOptionsForColumn = fieldOptions[column];
      if (fieldOptionsForColumn) {
        const option = fieldOptionsForColumn.find(
          (opt) => opt.value === foreignKeyValue
        );
        if (option) {
          return option.label;
        }
      }
      return foreignKeyValue;
    } else {
      return record[column];
    }
  };

  // Filtro de búsqueda
  const filteredRecords = search
    ? records.filter((record) => {
        return visibleColumns.some((column) => {
          const value = getColumnDisplayValue(record, column);
          return value?.toString()?.toLowerCase().includes(search.toLowerCase());
        });
      })
    : records;

  // Limpiar filtros
  const clearFilters = () => {
    setVisibleColumns(columns);
    setSearch('');
    localStorage.removeItem(LOCAL_STORAGE_COLUMNS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_SEARCH_KEY);

    fetchTableData(selectedTable);
  };

  // Manejar cambio en búsqueda
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    localStorage.setItem(LOCAL_STORAGE_SEARCH_KEY, e.target.value);
  };

  // Manejar checkboxes
  const handleCheckboxChange = (recordId) => {
    setSelectedRecords((prevSelected) => {
      if (prevSelected.includes(recordId)) {
        return prevSelected.filter((id) => id !== recordId);
      } else {
        return [...prevSelected, recordId];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allRecordIds = filteredRecords.map((record) => record.id);
      setSelectedRecords(allRecordIds);
    } else {
      setSelectedRecords([]);
    }
  };

  // Actualización masiva
  const handleBulkUpdateChange = (field, value) => {
    setBulkUpdateData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const applyBulkUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${selectedTable}/bulk-update`,
        {
          recordIds: selectedRecords,
          updates: bulkUpdateData,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            tableType: 'provider',
          },
        }
      );
      alert('Registros actualizados con éxito');
      fetchTableData(selectedTable);
      setSelectedRecords([]);
      setBulkUpdateData({});
    } catch (error) {
      console.error(error);
      setError('Error actualizando los registros');
    }
  };

  // Obtener opciones para campos foráneos
  useEffect(() => {
    const fetchFieldOptions = async () => {
      try {
        const token = localStorage.getItem('token');
        const options = {};

        for (const field of multiSelectFields) {
          const response = await axios.get(
            `https://impulso-capital-back.onrender.com/api/inscriptions/tables/${selectedTable}/field-options/${field}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                tableType: 'provider',
              },
            }
          );
          options[field] = response.data.options;
        }
        setFieldOptions(options);
      } catch (error) {
        console.error(error);
        setError('Error obteniendo las opciones de los campos');
      }
    };

    if (multiSelectFields.length > 0 && selectedTable) {
      fetchFieldOptions();
    } else {
      setFieldOptions({});
    }
  }, [multiSelectFields, selectedTable]);

  return (
    <div className="content-wrapper">
      {/* Cabecera */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Gestionar Tablas de Proveedores</h1>
            </div>
            <div className="col-sm-6 d-flex justify-content-end">
              <button
                className="btn btn-light mr-2"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                {showSearchBar ? 'Ocultar búsqueda' : 'Mostrar búsqueda'}
              </button>
              <select
                id="tableSelect"
                className="form-control"
                value={selectedTable}
                onChange={handleTableSelect}
                style={{ maxWidth: '250px' }}
              >
                <option value="">-- Selecciona una tabla --</option>
                {tables.length > 0 &&
                  tables.map((table) => (
                    <option key={table.table_name} value={table.table_name}>
                      {table.table_name}
                    </option>
                  ))}
              </select>
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
                            onChange={handleSearchChange}
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
                    <div className="d-flex justify-content-center p-3">
                      Cargando...
                    </div>
                  ) : (
                    <table className="table table-hover text-nowrap minimal-table">
                      <thead>
                        <tr>
                          {isPrimaryTable && (
                            <th>
                              <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={
                                  selectedRecords.length ===
                                    filteredRecords.length &&
                                  filteredRecords.length > 0
                                }
                              />
                            </th>
                          )}
                          {visibleColumns.length > 0 &&
                            visibleColumns.map((column) => (
                              <th key={column}>{column}</th>
                            ))}
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length > 0 ? (
                          filteredRecords.map((record) => (
                            <tr key={record.id}>
                              {isPrimaryTable && (
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedRecords.includes(record.id)}
                                    onChange={() => handleCheckboxChange(record.id)}
                                  />
                                </td>
                              )}
                              {visibleColumns.map((column) => (
                                <td key={column}>
                                  {getColumnDisplayValue(record, column)}
                                </td>
                              ))}
                              <td>
                                {/* 2. Deshabilitar el botón Editar si role_id = 5 */}
                                <button
                                  className="btn btn-sm btn-primary"
                                  disabled={getLoggedUserRoleId() === '5'}
                                  onClick={() => {
                                    if (getLoggedUserRoleId() === '5') {
                                      alert('No tienes permisos para editar.');
                                      return;
                                    }
                                    navigate(`/table/${selectedTable}/record/${record.id}`);
                                  }}
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={
                                isPrimaryTable
                                  ? visibleColumns.length + 2
                                  : visibleColumns.length + 1
                              }
                              className="text-center"
                            >
                              No hay registros para mostrar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}

                  {/* Sección de actualización masiva */}
                  {isPrimaryTable && selectedRecords.length > 0 && (
                    <div className="bulk-update-section mt-3 p-3 bg-light">
                      <h4>Actualizar campos seleccionados</h4>
                      {multiSelectFields.map((field) => (
                        <div key={field} className="form-group">
                          <label>{field}</label>
                          <select
                            className="form-control"
                            value={bulkUpdateData[field] || ''}
                            onChange={(e) => handleBulkUpdateChange(field, e.target.value)}
                          >
                            <option value="">-- Selecciona una opción --</option>
                            {fieldOptions[field]?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                      <button className="btn btn-primary" onClick={applyBulkUpdate}>
                        Aplicar cambios
                      </button>
                    </div>
                  )}

                  {/* Botón para limpiar filtros */}
                  <div className="mt-3">
                    <button className="btn btn-secondary" onClick={clearFilters}>
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
