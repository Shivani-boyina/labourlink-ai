package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Labour;
import com.labourlink.labourlinkai.repository.LabourRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LabourServiceImpl implements LabourService {

    @Autowired
    private LabourRepository labourRepository;

    @Override
    public Labour createLabour(Labour labour) {
        return labourRepository.save(labour);
    }

    @Override
    public List<Labour> getAllLabours() {
        return labourRepository.findAll();
    }

    @Override
    public Labour getLabourById(Long id) {
        return labourRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Labour not found with id: " + id));
    }

    @Override
    public Labour updateLabour(Long id, Labour labour) {
        Labour existing = labourRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Labour not found with id: " + id));

        existing.setName(labour.getName());
        existing.setSkill(labour.getSkill());
        existing.setLocation(labour.getLocation());

        return labourRepository.save(existing);
    }

    @Override
    public void deleteLabour(Long id) {
        labourRepository.deleteById(id);
    }

    @Override
    public List<Labour> filterBySkill(String skill) {
        return labourRepository.findAll().stream()
                .filter(l -> l.getSkill() != null
                        && l.getSkill().equalsIgnoreCase(skill))
                .toList();
    }

    @Override
    public List<Labour> filterByLocation(String location) {
        return labourRepository.findAll().stream()
                .filter(l -> l.getLocation() != null
                        && l.getLocation().equalsIgnoreCase(location))
                .toList();
    }

    @Override
    public List<Labour> searchAndRankLabours(String skill, String location) {

        return labourRepository.findAll().stream()
                .filter(l -> skill == null || skill.isEmpty()
                        || (l.getSkill() != null && l.getSkill().equalsIgnoreCase(skill)))
                .filter(l -> location == null || location.isEmpty()
                        || (l.getLocation() != null && l.getLocation().equalsIgnoreCase(location)))
                .toList();
    }
}