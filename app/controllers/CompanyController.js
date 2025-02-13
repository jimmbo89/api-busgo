const logger = require('../../config/logger'); // Logger para seguimiento
const { CompanyRepository } = require('../repositories');

const CompanyController = {
    // Obtener todas las compañías
    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las compañías`);

        try {
            const companies = await CompanyRepository.findAll();

            if (!companies.length) {
                return res.status(204).json({ msg: 'CompaniesNotFound' });
            }

            const mappedCompanies = companies.map(company => ({
                id: company.id,
                name: company.name,
                address: company.address,
                rut: company.rut,
                phone: company.phone,
                image: company.image,
            }));

            res.status(200).json({ companies: mappedCompanies });
        } catch (error) {
            logger.error('CompanyController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Crear una nueva compañía
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva compañía`);
        logger.info('datos recibidos al crear una empresa');
        logger.info(JSON.stringify(req.body));

        const {rut} = req.body;
        req.body.user_id = req.user.id;
        
        try {
            // Verifica si ya existe una empresa con el mismo rut (excluyendo la empresa actual)
            const existingCompany = await CompanyRepository.existsByRut(rut);

            if (existingCompany) {
                logger.error('El RUT ya está registrado en otra empresa:' + rut);
                return res.status(400).json({ error: 'DuplicateRut', msg: 'El RUT ya está registrado en otra empresa.' });
            }
            
            const company = await CompanyRepository.create(req.body, req.file);
            
            res.status(201).json({ 'company': company });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            
            logger.error('CompanyController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una compañía por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca una compañía con ID ${req.body.id}`);

        try {
            const company = await CompanyRepository.findById(req.body.id );

            if (!company) {
                return res.status(404).json({ msg: 'CompanyNotFound' });
            }

            const mappedCompany = {
                id: company.id,
                name: company.name,
                address: company.address,
                rut: company.rut,
                phone: company.phone,
                image: company.image,
            };

            res.status(200).json({ company: mappedCompany });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('CompanyController->show:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una compañía
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza la compañía con ID ${req.body.id}`);
        logger.info('datos recibidos al editar una empresa');
        logger.info(JSON.stringify(req.body));

        const { id, rut } = req.body;

        try {
            const company = await CompanyRepository.findById(id);
            if (!company) {
                return res.status(404).json({ msg: 'CompanyNotFound' });
            }

            // Verifica si ya existe una empresa con el mismo rut (excluyendo la empresa actual)
            if (rut){
                const existingCompany = await CompanyRepository.existsByRut(rut, id);

                if (existingCompany) {
                    logger.error('El RUT ya está registrado en otra empresa:' + rut);
                    return res.status(400).json({ error: 'DuplicateRut', msg: 'El RUT ya está registrado en otra empresa.' });
                }
            }

            const companyUpdate = await CompanyRepository.update(company, req.body, req.file);

            res.status(200).json({ 'company': companyUpdate });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('CompanyController->update:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una compañía
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina la compañía con ID ${req.body.id}`);

        try {
            const company = await CompanyRepository.findById(req.body.id);

            if (!company) {
                return res.status(204).json({ msg: 'CompanyNotFound' });
            }

           const companyDelete = await CompanyRepository.delete(company);

            res.status(200).json({ msg: 'CompanyDeleted' });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('CompanyController->destroy:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = CompanyController;
