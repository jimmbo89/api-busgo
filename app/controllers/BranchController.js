const logger = require('../../config/logger'); // Logger para seguimiento
const { BranchRepository, CompanyRepository } = require('../repositories');

const BranchController = {
    // Obtener todas las sucursales
    async index_login(req, res) {
        logger.info(`Entra a buscar las sucursales en el login`);

        try {
            const branches = await BranchRepository.findAll();

            if (!branches.length) {
                return res.status(204).json({ msg: 'BranchesNotFound' });
            }

            const mappedBranches = branches.map(branch => ({
                id: branch.id,
                company_id: branch.company_id,
                name: branch.name,
                address: branch.address,
                rut: branch.rut,
                phone: branch.phone,
                image: branch.image,
                companyName: branch.company.name, // Incluir los datos de la compañía asociada
                companyImage: branch.company.image, // Incluir los datos de la compañía asociada
            }));

            res.status(200).json({ branches: mappedBranches });
        } catch (error) {
            logger.error('BranchController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    async index(req, res) {
        logger.info(`${req.user.name} - Entra a buscar las sucursales`);

        try {
            const branches = await BranchRepository.findAll();

            if (!branches.length) {
                return res.status(204).json({ msg: 'BranchesNotFound' });
            }

            const mappedBranches = branches.map(branch => ({
                id: branch.id,
                company_id: branch.company_id,
                name: branch.name,
                address: branch.address,
                rut: branch.rut,
                phone: branch.phone,
                image: branch.image,
                companyName: branch.company.name, // Incluir los datos de la compañía asociada
                companyImage: branch.company.image, // Incluir los datos de la compañía asociada
            }));

            res.status(200).json({ branches: mappedBranches });
        } catch (error) {
            logger.error('BranchController->index: ' + error.message);
            res.status(500).json({ error: 'ServerError', details: error.message });
        }
    },

    // Crear una nueva sucursal
    async store(req, res) {
        logger.info(`${req.user.name} - Crea una nueva sucursal`);
        logger.info('datos recibidos al crear una sucursal');
        logger.info(JSON.stringify(req.body));

        const { rut, company_id } = req.body;

        try {
            // Verifica si ya existe una sucursal con el mismo rut (excluyendo la sucursal actual)
            
            if (rut && rut.trim() !== '') {
                const existingBranch = await BranchRepository.existsByRut(rut);
                
                if (existingBranch) {
                    logger.error('El RUT ya está registrado en otra sucursal: ' + rut);
                    return res.status(400).json({ 
                        error: 'DuplicateRut', 
                        msg: 'El RUT ya está registrado en otra sucursal.' 
                    });
                }
            }

        // Verificar si le empresa existe
        const company = await CompanyRepository.findById(company_id);
        if (!company) {
            logger.error(`BranchController->store: Empresa no encontrada con ID ${company_id}`);
            return res.status(404).json({ msg: 'CompanyNotFound' });
        }

        if (rut){
            const existingBranch = await BranchRepository.existsByRut(rut);

            if (existingBranch) {
                logger.error('El RUT ya está registrado en otra sucursal:' + rut);
                return res.status(400).json({ error: 'DuplicateRut', msg: 'El RUT ya está registrado en otra sucursal.' });
            }
        }

        const branch = await BranchRepository.create(req.body, req.file);

            res.status(201).json({ 'branch': branch });
        } catch (error) {
            const errorMsg = error.details
                ? error.details.map(detail => detail.message).join(', ')
                : error.message || 'Error desconocido';
            
            logger.error('BranchController->store:' + errorMsg);
            return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Obtener una sucursal por ID
    async show(req, res) {
        logger.info(`${req.user.name} - Busca una sucursal con ID ${req.body.id}`);

        try {
            const branch = await BranchRepository.findById(req.body.id);

            if (!branch) {
                return res.status(404).json({ msg: 'BranchNotFound' });
            }

            const mappedBranch = {
                id: branch.id,
                companyId: branch.company_id,
                name: branch.name,
                address: branch.address,
                rut: branch.rut,
                phone: branch.phone,
                image: branch.image,
                companyName: branch.company.name, // Incluir los datos de la compañía asociada
            };

            res.status(200).json({ branch: mappedBranch });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('BranchController->show:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Actualizar una sucursal
    async update(req, res) {
        logger.info(`${req.user.name} - Actualiza la sucursal con ID ${req.body.id}`);
        logger.info('datos recibidos al editar una sucursal');
        logger.info(JSON.stringify(req.body));

        const { id, rut, company_id } = req.body;

        try {
            const branch = await BranchRepository.findById(id);
            if (!branch) {
                return res.status(404).json({ msg: 'BranchNotFound' });
            }
            
            // Verifica si ya existe una sucursal con el mismo rut (excluyendo la sucursal actual)
            if (rut){
                const existingBranch = await BranchRepository.existsByRut(rut, id);

                if (existingBranch) {
                    logger.error('El RUT ya está registrado en otra sucursal:' + rut);
                    return res.status(400).json({ error: 'DuplicateRut', msg: 'El RUT ya está registrado en otra sucursal.' });
                }
            }

            if (company_id) {
             // Verificar si le empresa existe
            const company = await CompanyRepository.findById(company_id);
            if (!company) {
                logger.error(`BranchController->store: Empresa no encontrada con ID ${company_id}`);
                return res.status(404).json({ msg: 'CompanyNotFound' });
            }   
            }

            const branchUpdate = await BranchRepository.update(branch, req.body, req.file);
            
            
            res.status(200).json({ 'branch': branchUpdate });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('BranchController->update:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },

    // Eliminar una sucursal
    async destroy(req, res) {
        logger.info(`${req.user.name} - Elimina la sucursal con ID ${req.body.id}`);

        try {
            const branch = await BranchRepository.findById(req.body.id);

            if (!branch) {
                return res.status(404).json({ msg: 'BranchNotFound' });
            }

            const branchDelete = await BranchRepository.delete(branch);

            res.status(200).json({ msg: 'BranchDeleted' });
        } catch (error) {
            const errorMsg = error.details
            ? error.details.map(detail => detail.message).join(', ')
            : error.message || 'Error desconocido';
        
        logger.error('BranchController->destroy:' + errorMsg);
        return res.status(500).json({ error: 'ServerError', details: errorMsg });
        }
    },
};

module.exports = BranchController;
