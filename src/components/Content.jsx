export default function Content() {
  return (
    <div className="content-wrapper">
      {/* Content Header (Page header) */}
      <section className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1>Escritorio</h1>
            </div>
          </div>
        </div>
      </section>
      {/* Main content */}
      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              {/* Default box */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Estadísticas</h3>
                  <div className="card-tools">
                    <button type="button" className="btn btn-tool" data-card-widget="collapse" title="Collapse">
                      <i className="fas fa-minus" />
                    </button>
                    <button type="button" className="btn btn-tool" data-card-widget="remove" title="Remove">
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {/* Iframe para Power BI */}
                  <iframe
                    title="IC 2024 VF"
                    width="100%"
                    height="541.25"
                    src="https://app.powerbi.com/reportEmbed?reportId=60ca53c0-61e3-43bc-bb5c-f0dc4e591816&autoAuth=true&ctid=81640f82-5c40-4b9b-aac6-d32388466711"
                    frameBorder="0"
                    allowFullScreen="true"
                  ></iframe>
                </div>
                {/* /.card-body */}
              </div>
              {/* /.card */}
            </div>
          </div>
        </div>
      </section>
      {/* /.content */}
    </div>
  );
}

